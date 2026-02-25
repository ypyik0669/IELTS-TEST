import {
  aiJobSchema,
  aiJobStatusSchema,
  type AiJob,
  type AiJobStatus,
  type SpeakingEvaluateRequest,
  type SpeakingTranscribeRequest,
  type WritingEvaluateRequest,
} from "@ielts/shared";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { Job, Queue } from "bullmq";
import IORedis, { RedisOptions } from "ioredis";

type SupportedJobType = "writing_evaluate" | "speaking_transcribe" | "speaking_evaluate";

const mapState = (state: string): AiJobStatus => {
  if (state === "active") {
    return "running";
  }
  if (state === "completed") {
    return "done";
  }
  if (state === "failed") {
    return "failed";
  }
  return "queued";
};

@Injectable()
export class AiService implements OnModuleDestroy {
  private readonly logger = new Logger(AiService.name);
  private readonly directMode: boolean;
  private readonly queue?: Queue;
  private readonly directClient?: AxiosInstance;
  private readonly directJobs = new Map<string, AiJob>();

  constructor(private readonly configService: ConfigService) {
    this.directMode = this.configService.get<boolean>("AI_DIRECT_MODE") ?? false;
    if (this.directMode) {
      this.directClient = axios.create({
        baseURL: this.configService.getOrThrow<string>("AI_GATEWAY_URL"),
        timeout: 90_000,
      });
      this.logger.warn(
        "AI_DIRECT_MODE is enabled. Jobs are processed in API process without Redis worker.",
      );
      return;
    }

    const redisConfig: RedisOptions = {
      host: this.configService.getOrThrow<string>("REDIS_HOST"),
      port: this.configService.getOrThrow<number>("REDIS_PORT"),
      maxRetriesPerRequest: null,
    };

    const password = this.configService.get<string>("REDIS_PASSWORD");
    if (password) {
      redisConfig.password = password;
    }

    const connection = new IORedis(redisConfig);
    this.queue = new Queue(this.configService.getOrThrow("AI_QUEUE_NAME"), {
      connection,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
  }

  async enqueueWritingEvaluate(payload: WritingEvaluateRequest): Promise<{ jobId: string }> {
    const job = await this.addJob("writing_evaluate", payload);
    return { jobId: String(job.id) };
  }

  async enqueueSpeakingTranscribe(payload: SpeakingTranscribeRequest): Promise<{ jobId: string }> {
    const job = await this.addJob("speaking_transcribe", payload);
    return { jobId: String(job.id) };
  }

  async enqueueSpeakingEvaluate(payload: SpeakingEvaluateRequest): Promise<{ jobId: string }> {
    const job = await this.addJob("speaking_evaluate", payload);
    return { jobId: String(job.id) };
  }

  async getJob(id: string): Promise<AiJob | null> {
    if (this.directMode) {
      return this.directJobs.get(id) ?? null;
    }

    const queue = this.getQueue();
    const job = await queue.getJob(id);
    if (!job) {
      return null;
    }

    return this.toAiJob(job);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.directMode && this.queue) {
      await this.queue.close();
    }
  }

  private async addJob(type: SupportedJobType, payload: unknown): Promise<{ id: string }> {
    if (this.directMode) {
      return this.addDirectJob(type, payload);
    }

    const queue = this.getQueue();
    const job = await queue.add(type, payload, {
      jobId: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      backoff: {
        type: "exponential",
        delay: 1200,
      },
    });
    return { id: String(job.id) };
  }

  private addDirectJob(type: SupportedJobType, payload: unknown): { id: string } {
    const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();
    const userId = String((payload as { userId?: string }).userId ?? "unknown");
    const provider =
      (payload as { provider?: string }).provider === "paid_optional"
        ? "paid_optional"
        : "local_ollama";

    this.directJobs.set(
      id,
      aiJobSchema.parse({
        id,
        type,
        status: "queued",
        provider,
        userId,
        createdAt: now,
        updatedAt: now,
        payload,
        result: null,
        error: null,
      }),
    );

    void this.runDirectJob(id, type, payload);
    return { id };
  }

  private async runDirectJob(
    jobId: string,
    type: SupportedJobType,
    payload: unknown,
  ): Promise<void> {
    const existing = this.directJobs.get(jobId);
    if (!existing || !this.directClient) {
      return;
    }
    this.directJobs.set(jobId, {
      ...existing,
      status: "running",
      updatedAt: new Date().toISOString(),
    });

    try {
      const route =
        type === "writing_evaluate"
          ? "/internal/ai/writing/evaluate"
          : type === "speaking_transcribe"
            ? "/internal/ai/speaking/transcribe"
            : "/internal/ai/speaking/evaluate";

      const response = await this.directClient.post(route, payload);
      const finished = this.directJobs.get(jobId);
      if (!finished) {
        return;
      }

      this.directJobs.set(
        jobId,
        aiJobSchema.parse({
          ...finished,
          status: aiJobStatusSchema.parse("done"),
          result: response.data,
          error: null,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      const failed = this.directJobs.get(jobId);
      if (!failed) {
        return;
      }
      this.directJobs.set(
        jobId,
        aiJobSchema.parse({
          ...failed,
          status: aiJobStatusSchema.parse("failed"),
          error: (error as Error).message,
          updatedAt: new Date().toISOString(),
        }),
      );
    }
  }

  private getQueue(): Queue {
    if (!this.queue) {
      throw new Error("Queue is not initialized. Check AI_DIRECT_MODE / Redis settings.");
    }
    return this.queue;
  }

  private async toAiJob(job: Job): Promise<AiJob> {
    const state = await job.getState();
    const status = aiJobStatusSchema.parse(mapState(state));
    const aiJob: AiJob = {
      id: String(job.id),
      type: job.name as SupportedJobType,
      status,
      provider:
        (job.data as { provider?: string }).provider === "paid_optional"
          ? "paid_optional"
          : "local_ollama",
      userId: String((job.data as { userId?: string }).userId ?? "unknown"),
      createdAt: new Date(job.timestamp).toISOString(),
      updatedAt: new Date(job.processedOn ?? job.timestamp).toISOString(),
      payload: job.data,
      result: job.returnvalue ?? null,
      error: job.failedReason ?? null,
    };

    return aiJobSchema.parse(aiJob);
  }
}

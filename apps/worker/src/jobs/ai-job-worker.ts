import {
  speakingEvaluateRequestSchema,
  speakingTranscribeRequestSchema,
  writingEvaluateRequestSchema,
} from "@ielts/shared";
import { Job, QueueEvents, Worker } from "bullmq";
import IORedis, { RedisOptions } from "ioredis";
import { AiGatewayClient } from "../clients/ai-gateway.client";
import type { WorkerEnv } from "../config/env";

type SupportedJobType = "writing_evaluate" | "speaking_transcribe" | "speaking_evaluate";

export class AiJobWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker;
  private readonly queueEvents: QueueEvents;
  private readonly gatewayClient: AiGatewayClient;

  constructor(private readonly env: WorkerEnv) {
    const redisConfig: RedisOptions = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null,
    };

    if (env.REDIS_PASSWORD) {
      redisConfig.password = env.REDIS_PASSWORD;
    }

    this.connection = new IORedis(redisConfig);
    this.gatewayClient = new AiGatewayClient(env.AI_GATEWAY_URL);

    this.worker = new Worker(
      env.AI_QUEUE_NAME,
      async (job: Job) => this.handleJob(job),
      {
        connection: this.connection,
        concurrency: env.WORKER_CONCURRENCY,
      },
    );

    this.queueEvents = new QueueEvents(env.AI_QUEUE_NAME, {
      connection: this.connection,
    });
  }

  async start(): Promise<void> {
    this.worker.on("completed", (job) => {
      // eslint-disable-next-line no-console
      console.log(`[worker] completed ${job.id} (${job.name})`);
    });
    this.worker.on("failed", (job, error) => {
      // eslint-disable-next-line no-console
      console.error(`[worker] failed ${job?.id} (${job?.name})`, error.message);
    });
    this.queueEvents.on("error", (error) => {
      // eslint-disable-next-line no-console
      console.error("[worker] queue event error", error.message);
    });
    await this.queueEvents.waitUntilReady();
    // eslint-disable-next-line no-console
    console.log("[worker] ready");
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queueEvents.close();
    await this.connection.quit();
  }

  private async handleJob(job: Job): Promise<unknown> {
    const type = job.name as SupportedJobType;
    switch (type) {
      case "writing_evaluate": {
        const payload = writingEvaluateRequestSchema.parse(job.data);
        return this.gatewayClient.evaluateWriting(payload);
      }
      case "speaking_transcribe": {
        const payload = speakingTranscribeRequestSchema.parse(job.data);
        return this.gatewayClient.transcribeSpeaking(payload);
      }
      case "speaking_evaluate": {
        const payload = speakingEvaluateRequestSchema.parse(job.data);
        return this.gatewayClient.evaluateSpeaking(payload);
      }
      default:
        throw new Error(`Unsupported job type: ${type}`);
    }
  }
}

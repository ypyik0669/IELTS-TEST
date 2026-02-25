import {
  heuristicSpeakingEvaluation,
  heuristicWritingEvaluation,
  speakingAiResultSchema,
  type SpeakingAiResult,
  speakingEvaluateRequestSchema,
  type SpeakingEvaluateRequest,
  speakingTranscribeRequestSchema,
  type SpeakingTranscribeRequest,
  writingAiResultSchema,
  type WritingAiResult,
  writingEvaluateRequestSchema,
  type WritingEvaluateRequest,
} from "@ielts/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { OllamaClient } from "./ollama.client";

const execFileAsync = promisify(execFile);

const coerceScore = (value: unknown): number => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 5.5;
  }
  return Math.min(9, Math.max(0, Number(numeric.toFixed(1))));
};

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly ollamaClient: OllamaClient,
    private readonly configService: ConfigService,
  ) {}

  async evaluateWriting(rawRequest: WritingEvaluateRequest): Promise<WritingAiResult> {
    const request = writingEvaluateRequestSchema.parse(rawRequest);
    try {
      const model = this.resolveWritingModel();
      const aiResult = await this.ollamaClient.generateStructuredJson<{
        tr: number;
        cc: number;
        lr: number;
        gra: number;
        comments: string[];
        revisionSuggestions: string[];
      }>({
        model,
        systemPrompt:
          "You are an IELTS Writing examiner assistant. Return strict JSON only.",
        userPrompt: `
Score this essay for IELTS writing with criteria:
- tr: task response/task achievement
- cc: coherence/cohesion
- lr: lexical resource
- gra: grammatical range/accuracy
Return values 0-9 with one decimal.
Return 3 short comments and 3 concrete revisionSuggestions.
Prompt: ${request.prompt}
Essay: ${request.essay}
        `.trim(),
      });

      return writingAiResultSchema.parse({
        tr: coerceScore(aiResult.tr),
        cc: coerceScore(aiResult.cc),
        lr: coerceScore(aiResult.lr),
        gra: coerceScore(aiResult.gra),
        comments: aiResult.comments ?? [],
        revisionSuggestions: aiResult.revisionSuggestions ?? [],
        provider: request.provider,
        model,
      });
    } catch (error) {
      this.logger.warn(
        `Writing evaluation fell back to heuristic mode: ${(error as Error).message}`,
      );
      const fallback = heuristicWritingEvaluation(request);
      return {
        ...fallback,
        provider: request.provider,
      };
    }
  }

  async transcribeSpeaking(
    rawRequest: SpeakingTranscribeRequest,
  ): Promise<{ transcript: string; model: string; provider: string }> {
    const request = speakingTranscribeRequestSchema.parse(rawRequest);
    const modelSize = this.resolveWhisperModelSize();
    const pythonBin = this.configService.getOrThrow<string>("PYTHON_BIN");
    const scriptPath = this.configService.getOrThrow<string>("TRANSCRIBE_SCRIPT_PATH");

    try {
      const { stdout } = await execFileAsync(
        pythonBin,
        [scriptPath, "--audio", request.audioPath, "--model", modelSize],
        {
          timeout: 90_000,
          windowsHide: true,
        },
      );

      const parsed = JSON.parse(stdout) as { transcript?: string; model?: string };
      if (!parsed.transcript) {
        throw new Error("Transcription did not return transcript text.");
      }
      return {
        transcript: parsed.transcript,
        model: parsed.model ?? `faster-whisper-${modelSize}`,
        provider: request.provider,
      };
    } catch (error) {
      this.logger.warn(
        `Transcription fell back to lightweight mode: ${(error as Error).message}`,
      );
      return {
        transcript: `Fallback transcript for ${request.audioPath}. Please install faster-whisper for full quality.`,
        model: "transcribe-fallback",
        provider: request.provider,
      };
    }
  }

  async evaluateSpeaking(rawRequest: SpeakingEvaluateRequest): Promise<SpeakingAiResult> {
    const request = speakingEvaluateRequestSchema.parse(rawRequest);

    try {
      const model = this.resolveWritingModel();
      const aiResult = await this.ollamaClient.generateStructuredJson<{
        fc: number;
        lr: number;
        gra: number;
        pr: number;
        comments: string[];
      }>({
        model,
        systemPrompt:
          "You are an IELTS speaking examiner assistant. Return strict JSON only.",
        userPrompt: `
Score this speaking transcript for IELTS:
- fc: fluency/coherence
- lr: lexical resource
- gra: grammatical range/accuracy
- pr: pronunciation proxy score from transcript quality and disfluency cues
Return values 0-9 with one decimal.
Return 3 short coaching comments.
Topic: ${request.topic}
Transcript: ${request.transcript}
        `.trim(),
      });

      return speakingAiResultSchema.parse({
        transcript: request.transcript,
        fc: coerceScore(aiResult.fc),
        lr: coerceScore(aiResult.lr),
        gra: coerceScore(aiResult.gra),
        pr: coerceScore(aiResult.pr),
        comments: aiResult.comments ?? [],
        provider: request.provider,
        model,
      });
    } catch (error) {
      this.logger.warn(
        `Speaking evaluation fell back to heuristic mode: ${(error as Error).message}`,
      );
      const fallback = heuristicSpeakingEvaluation(request);
      return {
        ...fallback,
        provider: request.provider,
      };
    }
  }

  private resolveWritingModel(): string {
    const memoryGb = this.configService.get<number>("OLLAMA_GPU_MEMORY_GB") ?? 0;
    if (memoryGb >= 8) {
      return this.configService.getOrThrow<string>("OLLAMA_QWEN_7B_MODEL");
    }
    return this.configService.getOrThrow<string>("OLLAMA_QWEN_3B_MODEL");
  }

  private resolveWhisperModelSize(): "base" | "small" {
    const memoryGb = this.configService.get<number>("OLLAMA_GPU_MEMORY_GB") ?? 0;
    if (memoryGb >= 8) {
      return this.configService.getOrThrow<"base" | "small">("WHISPER_MODEL_DEFAULT");
    }
    return this.configService.getOrThrow<"base" | "small">(
      "WHISPER_MODEL_LOW_RESOURCE",
    );
  }
}

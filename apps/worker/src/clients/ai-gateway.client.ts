import type {
  SpeakingAiResult,
  SpeakingEvaluateRequest,
  SpeakingTranscribeRequest,
  WritingAiResult,
  WritingEvaluateRequest,
} from "@ielts/shared";
import axios, { AxiosInstance } from "axios";

export class AiGatewayClient {
  private readonly client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 90_000,
    });
  }

  async evaluateWriting(payload: WritingEvaluateRequest): Promise<WritingAiResult> {
    const { data } = await this.client.post<WritingAiResult>(
      "/internal/ai/writing/evaluate",
      payload,
    );
    return data;
  }

  async transcribeSpeaking(payload: SpeakingTranscribeRequest): Promise<{
    transcript: string;
    model: string;
    provider: string;
  }> {
    const { data } = await this.client.post<{
      transcript: string;
      model: string;
      provider: string;
    }>("/internal/ai/speaking/transcribe", payload);
    return data;
  }

  async evaluateSpeaking(payload: SpeakingEvaluateRequest): Promise<SpeakingAiResult> {
    const { data } = await this.client.post<SpeakingAiResult>(
      "/internal/ai/speaking/evaluate",
      payload,
    );
    return data;
  }
}

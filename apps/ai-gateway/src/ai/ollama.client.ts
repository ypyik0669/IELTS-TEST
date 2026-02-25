import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

interface OllamaChatResult {
  message?: {
    content?: string;
  };
}

@Injectable()
export class OllamaClient {
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.getOrThrow("OLLAMA_BASE_URL"),
      timeout: 45_000,
    });
  }

  async generateStructuredJson<T>(params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<T> {
    const response = await this.client.post<OllamaChatResult>("/api/chat", {
      model: params.model,
      format: "json",
      stream: false,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      options: {
        temperature: 0.2,
      },
    });

    const content = response.data?.message?.content?.trim();
    if (!content) {
      throw new Error("Ollama returned empty response.");
    }

    return JSON.parse(content) as T;
  }
}

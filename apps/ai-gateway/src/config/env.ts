import { z } from "zod";

export const envSchema = z.object({
  AI_GATEWAY_PORT: z.coerce.number().default(3002),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_GPU_MEMORY_GB: z.coerce.number().default(0),
  OLLAMA_QWEN_7B_MODEL: z.string().default("qwen2.5:7b-instruct-q4_K_M"),
  OLLAMA_QWEN_3B_MODEL: z.string().default("qwen2.5:3b-instruct-q4_K_M"),
  WHISPER_MODEL_DEFAULT: z.enum(["base", "small"]).default("small"),
  WHISPER_MODEL_LOW_RESOURCE: z.enum(["base", "small"]).default("base"),
  PYTHON_BIN: z.string().default("python"),
  TRANSCRIBE_SCRIPT_PATH: z.string().default("./scripts/transcribe.py"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadEnv = (): EnvConfig => envSchema.parse(process.env);

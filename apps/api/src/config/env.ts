import { z } from "zod";

export const envSchema = z.object({
  API_PORT: z.coerce.number().default(3001),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  AI_QUEUE_NAME: z.string().default("ai-jobs"),
  AI_DIRECT_MODE: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true")
    .default(false),
  AI_GATEWAY_URL: z.string().default("http://127.0.0.1:3002"),
  AI_DEFAULT_PROVIDER: z.enum(["local_ollama", "paid_optional"]).default("local_ollama"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadEnv = (): EnvConfig => envSchema.parse(process.env);

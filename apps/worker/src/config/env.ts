import { z } from "zod";

export const envSchema = z.object({
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  AI_QUEUE_NAME: z.string().default("ai-jobs"),
  AI_GATEWAY_URL: z.string().default("http://127.0.0.1:3002"),
  WORKER_CONCURRENCY: z.coerce.number().default(2),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export const loadWorkerEnv = (): WorkerEnv => envSchema.parse(process.env);

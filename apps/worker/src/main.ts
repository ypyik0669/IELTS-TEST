import { AiJobWorker } from "./jobs/ai-job-worker";
import { loadWorkerEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = loadWorkerEnv();
  const worker = new AiJobWorker(env);
  await worker.start();

  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[worker] bootstrap failed", error);
  process.exit(1);
});

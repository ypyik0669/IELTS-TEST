import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./ai/ai.module";
import { loadEnv } from "./config/env";
import { StudyModule } from "./study/study.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadEnv],
    }),
    AiModule,
    StudyModule,
  ],
})
export class AppModule {}

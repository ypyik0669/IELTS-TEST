import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiGatewayController } from "./ai.controller";
import { AiGatewayService } from "./ai.service";
import { OllamaClient } from "./ollama.client";

@Module({
  imports: [ConfigModule],
  controllers: [AiGatewayController],
  providers: [AiGatewayService, OllamaClient],
})
export class AiModule {}

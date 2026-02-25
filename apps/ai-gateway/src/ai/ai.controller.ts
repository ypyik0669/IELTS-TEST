import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { AiGatewayService } from "./ai.service";
import {
  SpeakingEvaluateDto,
  SpeakingTranscribeDto,
  WritingEvaluateDto,
} from "./dto";

@Controller("internal/ai")
export class AiGatewayController {
  constructor(private readonly aiService: AiGatewayService) {}

  @Post("writing/evaluate")
  @HttpCode(HttpStatus.OK)
  evaluateWriting(@Body() dto: WritingEvaluateDto) {
    return this.aiService.evaluateWriting(dto);
  }

  @Post("speaking/transcribe")
  @HttpCode(HttpStatus.OK)
  transcribeSpeaking(@Body() dto: SpeakingTranscribeDto) {
    return this.aiService.transcribeSpeaking(dto);
  }

  @Post("speaking/evaluate")
  @HttpCode(HttpStatus.OK)
  evaluateSpeaking(@Body() dto: SpeakingEvaluateDto) {
    return this.aiService.evaluateSpeaking(dto);
  }
}

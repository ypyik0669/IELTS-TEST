import {
  speakingEvaluateRequestSchema,
  speakingTranscribeRequestSchema,
  writingEvaluateRequestSchema,
} from "@ielts/shared";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { AiService } from "./ai.service";
import {
  JobIdParamDto,
  SpeakingEvaluateDto,
  SpeakingTranscribeDto,
  WritingEvaluateDto,
} from "./dto";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("writing/evaluate")
  async evaluateWriting(@Body() dto: WritingEvaluateDto) {
    const payload = writingEvaluateRequestSchema.parse(dto);
    return this.aiService.enqueueWritingEvaluate(payload);
  }

  @Post("speaking/transcribe")
  async transcribeSpeaking(@Body() dto: SpeakingTranscribeDto) {
    const payload = speakingTranscribeRequestSchema.parse(dto);
    return this.aiService.enqueueSpeakingTranscribe(payload);
  }

  @Post("speaking/evaluate")
  async evaluateSpeaking(@Body() dto: SpeakingEvaluateDto) {
    const payload = speakingEvaluateRequestSchema.parse(dto);
    return this.aiService.enqueueSpeakingEvaluate(payload);
  }

  @Get("jobs/:id")
  async getJob(@Param() params: JobIdParamDto) {
    const job = await this.aiService.getJob(params.id);
    if (!job) {
      throw new NotFoundException(`Job ${params.id} not found`);
    }

    return job;
  }
}

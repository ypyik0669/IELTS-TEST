import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  AddRubricDto,
  CrawlJobDto,
  DueCardsQueryDto,
  ImportContentDto,
  ListeningAttemptDto,
  NightlyChecklistDto,
  PlanRescheduleDto,
  ReadingAttemptDto,
  ReviewEventDto,
  SpeakingAttemptDto,
  UserQueryDto,
  WritingAttemptDto,
} from "./dto";
import { StudyService } from "./study.service";

@Controller()
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Get("dashboard/weekly")
  getDashboard(@Query() query: UserQueryDto) {
    return this.studyService.getWeeklyDashboard(query.userId);
  }

  @Get("plan/today")
  getTodayPlan(@Query() query: UserQueryDto) {
    return this.studyService.getTodayPlan(query.userId);
  }

  @Post("plan/reschedule")
  reschedulePlan(@Body() dto: PlanRescheduleDto) {
    return this.studyService.rescheduleTask(dto.userId, dto.taskId, dto.newDate);
  }

  @Post("attempts/listening")
  addListeningAttempt(@Body() dto: ListeningAttemptDto) {
    return this.studyService.addMetricAttempt(dto.userId, {
      skill: "listening",
      rawScore: dto.rawScore,
      totalQuestions: dto.totalQuestions,
      minutesUsed: dto.minutesUsed,
    });
  }

  @Post("attempts/reading")
  addReadingAttempt(@Body() dto: ReadingAttemptDto) {
    return this.studyService.addMetricAttempt(dto.userId, {
      skill: "reading",
      rawScore: dto.rawScore,
      totalQuestions: dto.totalQuestions,
      minutesUsed: dto.minutesUsed,
    });
  }

  @Post("attempts/writing")
  addWritingAttempt(@Body() dto: WritingAttemptDto) {
    return this.studyService.addRubricAttempt(dto.userId, {
      skill: "writing",
      promptOrTopic: dto.prompt,
      artifactId: dto.artifactId,
    });
  }

  @Post("attempts/speaking")
  addSpeakingAttempt(@Body() dto: SpeakingAttemptDto) {
    return this.studyService.addRubricAttempt(dto.userId, {
      skill: "speaking",
      promptOrTopic: dto.topic,
      artifactId: dto.artifactId,
    });
  }

  @Post("rubrics/writing/:attemptId")
  addWritingRubric(
    @Param("attemptId", new ParseUUIDPipe()) attemptId: string,
    @Body() dto: AddRubricDto,
  ) {
    return this.studyService.addRubricScores(dto.userId, attemptId, dto.scores);
  }

  @Post("rubrics/speaking/:attemptId")
  addSpeakingRubric(
    @Param("attemptId", new ParseUUIDPipe()) attemptId: string,
    @Body() dto: AddRubricDto,
  ) {
    return this.studyService.addRubricScores(dto.userId, attemptId, dto.scores);
  }

  @Get("coach/nightly-brief")
  getNightlyBrief(@Query() query: UserQueryDto) {
    return this.studyService.getNightlyBrief(query.userId);
  }

  @Post("coach/nightly-checklist")
  setNightlyChecklist(@Body() dto: NightlyChecklistDto) {
    return this.studyService.setNightlyChecklist(dto.userId, dto.tasks);
  }

  @Get("vocab/due-cards")
  getDueCards(@Query() query: DueCardsQueryDto) {
    return this.studyService.getDueCards(query.userId, query.limit ?? 20);
  }

  @Post("vocab/review-events")
  addReviewEvent(@Body() dto: ReviewEventDto) {
    return this.studyService.addReviewEvent(dto.userId, {
      cardId: dto.cardId,
      rating: dto.rating,
    });
  }

  @Post("content/crawl-jobs")
  addCrawlJob(@Body() dto: CrawlJobDto) {
    return this.studyService.createCrawlJob(dto.userId, dto.sourceUrl);
  }

  @Post("content/imports")
  addImport(@Body() dto: ImportContentDto) {
    return this.studyService.createImport(dto.userId, dto.fileName);
  }
}

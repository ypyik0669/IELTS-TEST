import {
  computeOverallBand,
  listeningRawToBand,
  readingAcademicRawToBand,
} from "@ielts/shared";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ContentRecord,
  MetricAttempt,
  ReviewEvent,
  RubricAttempt,
  RubricScore,
  SkillType,
  VocabCard,
} from "./types";

const nowIso = (): string => new Date().toISOString();

const defaultPlan = () => [
  { id: "plan-1", title: "Listening timed set (20 questions)", date: nowIso(), done: false },
  { id: "plan-2", title: "Writing Task 2 draft + revision", date: nowIso(), done: false },
  { id: "plan-3", title: "Night speaking 25 minutes with coach", date: nowIso(), done: false },
];

const defaultVocabCards = (): VocabCard[] => [
  {
    id: randomUUID(),
    lemma: "sustainable",
    tier: "academic",
    collocation: "sustainable development",
    example: "The city needs sustainable transport policies.",
    nextDueAt: nowIso(),
  },
  {
    id: randomUUID(),
    lemma: "allocate",
    tier: "academic",
    collocation: "allocate resources",
    example: "Governments should allocate funds to education.",
    nextDueAt: nowIso(),
  },
  {
    id: randomUUID(),
    lemma: "commute",
    tier: "foundation",
    collocation: "daily commute",
    example: "My daily commute takes about forty minutes.",
    nextDueAt: nowIso(),
  },
];

@Injectable()
export class StudyService {
  private readonly metricAttempts = new Map<string, MetricAttempt[]>();
  private readonly rubricAttempts = new Map<string, RubricAttempt[]>();
  private readonly rubrics = new Map<string, RubricScore[]>();
  private readonly plans = new Map<string, ReturnType<typeof defaultPlan>>();
  private readonly nightlyChecklists = new Map<string, string[]>();
  private readonly vocabCards = new Map<string, VocabCard[]>();
  private readonly reviewEvents = new Map<string, ReviewEvent[]>();
  private readonly contentRecords = new Map<string, ContentRecord[]>();

  getWeeklyDashboard(userId: string) {
    const metricAttempts = this.metricAttempts.get(userId) ?? [];
    const writingRubrics = this.collectAverageRubric(userId, "writing");
    const speakingRubrics = this.collectAverageRubric(userId, "speaking");

    const latestListening = this.latestMetric(userId, "listening");
    const latestReading = this.latestMetric(userId, "reading");

    const listeningBand = latestListening
      ? listeningRawToBand(latestListening.rawScore)
      : 0;
    const readingBand = latestReading
      ? readingAcademicRawToBand(latestReading.rawScore)
      : 0;

    const overallBand = computeOverallBand({
      listening: listeningBand,
      reading: readingBand,
      writing: writingRubrics.average,
      speaking: speakingRubrics.average,
    });

    return {
      userId,
      weeklyHours: this.calculateWeeklyHours(metricAttempts),
      listening: latestListening ?? null,
      reading: latestReading ?? null,
      writing: writingRubrics,
      speaking: speakingRubrics,
      overallBand,
      topErrors: this.topErrors(userId),
      tonightChecklist:
        this.nightlyChecklists.get(userId) ?? [
          "Speak 20 minutes (Part 2 + Part 3 follow-up)",
          "Revise one essay paragraph",
          "Review 15 SRS cards",
        ],
    };
  }

  getTodayPlan(userId: string) {
    if (!this.plans.has(userId)) {
      this.plans.set(userId, defaultPlan());
    }

    return {
      userId,
      tasks: this.plans.get(userId),
    };
  }

  rescheduleTask(userId: string, taskId: string, newDate: string) {
    const plan = this.getTodayPlan(userId).tasks ?? [];
    const task = plan.find((entry) => entry.id === taskId);
    if (task) {
      task.date = newDate;
    }
    return { ok: true, plan };
  }

  addMetricAttempt(
    userId: string,
    payload: {
      rawScore: number;
      totalQuestions: number;
      minutesUsed: number;
      skill: "listening" | "reading";
    },
  ) {
    const attempt: MetricAttempt = {
      id: randomUUID(),
      userId,
      createdAt: nowIso(),
      ...payload,
    };

    const history = this.metricAttempts.get(userId) ?? [];
    history.push(attempt);
    this.metricAttempts.set(userId, history);
    return attempt;
  }

  addRubricAttempt(
    userId: string,
    payload: {
      skill: "writing" | "speaking";
      promptOrTopic: string;
      artifactId: string;
    },
  ) {
    const attempt: RubricAttempt = {
      id: randomUUID(),
      userId,
      createdAt: nowIso(),
      ...payload,
    };

    const history = this.rubricAttempts.get(userId) ?? [];
    history.push(attempt);
    this.rubricAttempts.set(userId, history);
    return attempt;
  }

  addRubricScores(
    userId: string,
    attemptId: string,
    scores: Array<{ criterion: string; score: number; comment: string }>,
  ) {
    const rubricScores = scores.map((item) => ({
      attemptId,
      criterion: item.criterion,
      score: item.score,
      comment: item.comment,
    }));

    this.rubrics.set(attemptId, rubricScores);
    return {
      userId,
      attemptId,
      scores: rubricScores,
    };
  }

  getNightlyBrief(userId: string) {
    const dashboard = this.getWeeklyDashboard(userId);
    return {
      userId,
      summary: {
        listeningRaw: dashboard.listening?.rawScore ?? 0,
        readingRaw: dashboard.reading?.rawScore ?? 0,
        writingAvg: dashboard.writing.average,
        speakingAvg: dashboard.speaking.average,
      },
      checklist: dashboard.tonightChecklist,
      topErrors: dashboard.topErrors,
    };
  }

  setNightlyChecklist(userId: string, tasks: string[]) {
    this.nightlyChecklists.set(userId, tasks);
    return {
      userId,
      tasks,
    };
  }

  getDueCards(userId: string, limit = 20) {
    if (!this.vocabCards.has(userId)) {
      this.vocabCards.set(userId, defaultVocabCards());
    }

    const cards = this.vocabCards.get(userId) ?? [];
    const now = Date.now();
    return cards
      .filter((card) => new Date(card.nextDueAt).getTime() <= now)
      .slice(0, limit);
  }

  addReviewEvent(
    userId: string,
    payload: {
      cardId: string;
      rating: 1 | 2 | 3 | 4;
    },
  ) {
    const review: ReviewEvent = {
      cardId: payload.cardId,
      rating: payload.rating,
      reviewedAt: nowIso(),
      nextDueAt: new Date(Date.now() + payload.rating * 24 * 60 * 60 * 1000).toISOString(),
    };

    const history = this.reviewEvents.get(userId) ?? [];
    history.push(review);
    this.reviewEvents.set(userId, history);

    const cards = this.vocabCards.get(userId) ?? defaultVocabCards();
    this.vocabCards.set(
      userId,
      cards.map((card) =>
        card.id === payload.cardId
          ? {
              ...card,
              nextDueAt: review.nextDueAt,
            }
          : card,
      ),
    );

    return review;
  }

  createCrawlJob(userId: string, sourceUrl: string) {
    const record: ContentRecord = {
      id: randomUUID(),
      kind: "crawl_job",
      sourceUrl,
      status: "queued",
      createdAt: nowIso(),
    };

    const history = this.contentRecords.get(userId) ?? [];
    history.push(record);
    this.contentRecords.set(userId, history);
    return record;
  }

  createImport(userId: string, fileName: string) {
    const record: ContentRecord = {
      id: randomUUID(),
      kind: "import",
      fileName,
      status: "indexed",
      createdAt: nowIso(),
    };
    const history = this.contentRecords.get(userId) ?? [];
    history.push(record);
    this.contentRecords.set(userId, history);
    return record;
  }

  private calculateWeeklyHours(attempts: MetricAttempt[]) {
    const minutes = attempts
      .slice(-14)
      .reduce((acc, attempt) => acc + attempt.minutesUsed, 0);
    return Number((minutes / 60).toFixed(1));
  }

  private latestMetric(
    userId: string,
    skill: "listening" | "reading",
  ): MetricAttempt | undefined {
    const attempts = this.metricAttempts.get(userId) ?? [];
    return attempts.filter((entry) => entry.skill === skill).at(-1);
  }

  private collectAverageRubric(userId: string, skill: "writing" | "speaking") {
    const attempts = this.rubricAttempts.get(userId) ?? [];
    const skillAttempts = attempts.filter((attempt) => attempt.skill === skill);
    if (skillAttempts.length === 0) {
      return { average: 0, latest: [] as RubricScore[] };
    }

    const latestAttempt = skillAttempts.at(-1);
    const latestScores = latestAttempt ? this.rubrics.get(latestAttempt.id) ?? [] : [];
    const avg =
      latestScores.length > 0
        ? latestScores.reduce((acc, score) => acc + score.score, 0) / latestScores.length
        : 0;

    return {
      average: Number(avg.toFixed(1)),
      latest: latestScores,
    };
  }

  private topErrors(userId: string): string[] {
    const attempts = this.rubricAttempts.get(userId) ?? [];
    if (attempts.length === 0) {
      return ["grammar-articles", "lexical-collocation", "cohesion-reference"];
    }

    return ["grammar-articles", "lexical-collocation", "task-response-detail"];
  }
}

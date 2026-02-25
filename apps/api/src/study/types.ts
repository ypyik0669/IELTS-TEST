export type SkillType = "listening" | "reading" | "writing" | "speaking";

export interface AttemptBase {
  id: string;
  userId: string;
  skill: SkillType;
  createdAt: string;
}

export interface MetricAttempt extends AttemptBase {
  skill: "listening" | "reading";
  rawScore: number;
  totalQuestions: number;
  minutesUsed: number;
}

export interface RubricAttempt extends AttemptBase {
  skill: "writing" | "speaking";
  promptOrTopic: string;
  artifactId?: string;
}

export interface RubricScore {
  attemptId: string;
  criterion: string;
  score: number;
  comment: string;
}

export interface ReviewEvent {
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  reviewedAt: string;
  nextDueAt: string;
}

export interface VocabCard {
  id: string;
  lemma: string;
  tier: "foundation" | "academic" | "expansion" | "personal";
  collocation: string;
  example: string;
  nextDueAt: string;
}

export interface ContentRecord {
  id: string;
  kind: "crawl_job" | "import";
  sourceUrl?: string;
  fileName?: string;
  status: "queued" | "indexed";
  createdAt: string;
}

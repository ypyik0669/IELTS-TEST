import type {
  SpeakingAiResult,
  SpeakingEvaluateRequest,
  WritingAiResult,
  WritingEvaluateRequest,
} from "./types";

const clampBand = (value: number): number => Math.max(0, Math.min(9, Number(value.toFixed(1))));

export const heuristicWritingEvaluation = (
  request: WritingEvaluateRequest,
): WritingAiResult => {
  const words = request.essay.trim().split(/\s+/).length;
  const sentenceCount = Math.max(1, request.essay.split(/[.!?]+/).filter(Boolean).length);
  const avgSentenceLength = words / sentenceCount;
  const hasIntro = /in conclusion|to sum up|overall|this essay/i.test(request.essay);
  const connectorHits = (request.essay.match(/\bhowever|therefore|moreover|although|while|because\b/gi) ?? [])
    .length;

  const tr = clampBand(words >= 250 ? 6.5 + (hasIntro ? 0.5 : 0) : 5 + words / 120);
  const cc = clampBand(5 + Math.min(2, connectorHits / 4));
  const lr = clampBand(5 + Math.min(2, new Set(request.essay.toLowerCase().match(/[a-z]+/g) ?? []).size / 220));
  const gra = clampBand(5 + Math.min(2, avgSentenceLength / 13));

  return {
    tr,
    cc,
    lr,
    gra,
    comments: [
      "Use clearer topic sentences and explicit paragraph purpose statements.",
      "Add one concrete example sentence to strengthen argument support.",
      "Review article and preposition accuracy in long sentences.",
    ],
    revisionSuggestions: [
      "Rewrite paragraph 2 with one stronger topic sentence and one statistic/example.",
      "Replace 5 repeated words with precise collocations from your SRS list.",
      "Shorten one overlong sentence into two grammatically safe clauses.",
    ],
    provider: "local_ollama",
    model: "heuristic-fallback",
  };
};

export const heuristicSpeakingEvaluation = (
  request: SpeakingEvaluateRequest,
): SpeakingAiResult => {
  const words = request.transcript.trim().split(/\s+/).length;
  const fillerCount = (request.transcript.match(/\bum|uh|you know|like\b/gi) ?? []).length;
  const sentenceCount = Math.max(1, request.transcript.split(/[.!?]+/).filter(Boolean).length);
  const avgSentenceLength = words / sentenceCount;
  const connectorHits = (request.transcript.match(/\bhowever|for example|because|although|while\b/gi) ?? [])
    .length;

  const fc = clampBand(5.2 + Math.min(1.8, words / 130) - Math.min(0.8, fillerCount / 8));
  const lr = clampBand(5 + Math.min(2, new Set(request.transcript.toLowerCase().match(/[a-z]+/g) ?? []).size / 130));
  const gra = clampBand(5 + Math.min(2, avgSentenceLength / 12));
  const pr = clampBand(5.5 + Math.min(1.2, connectorHits / 5) - Math.min(0.7, fillerCount / 10));

  return {
    transcript: request.transcript,
    fc,
    lr,
    gra,
    pr,
    comments: [
      "Keep answers in 2-3 idea chunks and avoid long pauses before examples.",
      "Replace filler words with a short planning pause.",
      "Add one contrast linker per long answer to improve coherence.",
    ],
    provider: "local_ollama",
    model: "heuristic-fallback",
  };
};

export const computeOverallBand = (scores: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): number => {
  const average =
    (scores.listening + scores.reading + scores.writing + scores.speaking) / 4;
  const floorHalf = Math.floor(average * 2) / 2;
  const remainder = average - floorHalf;

  if (remainder >= 0.25 && remainder < 0.75) {
    return clampBand(floorHalf + 0.5);
  }
  if (remainder >= 0.75) {
    return clampBand(Math.ceil(average));
  }
  return clampBand(floorHalf);
};

type RawBandThreshold = { min: number; band: number };

const listeningThresholds: RawBandThreshold[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 32, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
];

const readingAcademicThresholds: RawBandThreshold[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
];

const toBandFromThresholds = (rawScore: number, thresholds: RawBandThreshold[]): number => {
  for (const threshold of thresholds) {
    if (rawScore >= threshold.min) {
      return threshold.band;
    }
  }
  return 3.5;
};

export const listeningRawToBand = (rawScore: number): number =>
  toBandFromThresholds(rawScore, listeningThresholds);

export const readingAcademicRawToBand = (rawScore: number): number =>
  toBandFromThresholds(rawScore, readingAcademicThresholds);

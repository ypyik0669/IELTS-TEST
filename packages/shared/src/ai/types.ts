import { z } from "zod";

export const aiProviderSchema = z.enum(["local_ollama", "paid_optional"]);
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const aiJobStatusSchema = z.enum(["queued", "running", "done", "failed"]);
export type AiJobStatus = z.infer<typeof aiJobStatusSchema>;

export const writingSkillSchema = z.object({
  tr: z.number().min(0).max(9),
  cc: z.number().min(0).max(9),
  lr: z.number().min(0).max(9),
  gra: z.number().min(0).max(9),
});

export const speakingSkillSchema = z.object({
  fc: z.number().min(0).max(9),
  lr: z.number().min(0).max(9),
  gra: z.number().min(0).max(9),
  pr: z.number().min(0).max(9),
});

export const writingAiResultSchema = writingSkillSchema.extend({
  comments: z.array(z.string()).min(1),
  revisionSuggestions: z.array(z.string()).min(1),
  provider: aiProviderSchema.default("local_ollama"),
  model: z.string().default("qwen2.5"),
});
export type WritingAiResult = z.infer<typeof writingAiResultSchema>;

export const speakingAiResultSchema = speakingSkillSchema.extend({
  transcript: z.string().min(1),
  comments: z.array(z.string()).min(1),
  provider: aiProviderSchema.default("local_ollama"),
  model: z.string().default("faster-whisper"),
});
export type SpeakingAiResult = z.infer<typeof speakingAiResultSchema>;

export const writingEvaluateRequestSchema = z.object({
  prompt: z.string().min(10),
  essay: z.string().min(30),
  provider: aiProviderSchema.default("local_ollama"),
  userId: z.string().min(1),
});
export type WritingEvaluateRequest = z.infer<typeof writingEvaluateRequestSchema>;

export const speakingTranscribeRequestSchema = z.object({
  audioPath: z.string().min(1),
  provider: aiProviderSchema.default("local_ollama"),
  userId: z.string().min(1),
});
export type SpeakingTranscribeRequest = z.infer<typeof speakingTranscribeRequestSchema>;

export const speakingEvaluateRequestSchema = z.object({
  transcript: z.string().min(10),
  topic: z.string().min(3),
  provider: aiProviderSchema.default("local_ollama"),
  userId: z.string().min(1),
});
export type SpeakingEvaluateRequest = z.infer<typeof speakingEvaluateRequestSchema>;

export const aiJobSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["writing_evaluate", "speaking_transcribe", "speaking_evaluate"]),
  status: aiJobStatusSchema,
  provider: aiProviderSchema,
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  payload: z.unknown(),
  result: z.unknown().nullable(),
  error: z.string().nullable(),
});
export type AiJob = z.infer<typeof aiJobSchema>;

export type WritingCriterion = keyof z.infer<typeof writingSkillSchema>;
export type SpeakingCriterion = keyof z.infer<typeof speakingSkillSchema>;

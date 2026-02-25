import { aiProviderSchema } from "@ielts/shared";
import { Transform } from "class-transformer";
import { IsIn, IsString, MinLength } from "class-validator";

const normalizeProvider = (value: unknown) => {
  const parsed = aiProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : "local_ollama";
};

export class WritingEvaluateDto {
  @IsString()
  @MinLength(10)
  prompt!: string;

  @IsString()
  @MinLength(30)
  essay!: string;

  @IsString()
  @MinLength(1)
  userId!: string;

  @Transform(({ value }) => normalizeProvider(value))
  @IsIn(["local_ollama", "paid_optional"])
  provider: "local_ollama" | "paid_optional" = "local_ollama";
}

export class SpeakingTranscribeDto {
  @IsString()
  @MinLength(1)
  audioPath!: string;

  @IsString()
  @MinLength(1)
  userId!: string;

  @Transform(({ value }) => normalizeProvider(value))
  @IsIn(["local_ollama", "paid_optional"])
  provider: "local_ollama" | "paid_optional" = "local_ollama";
}

export class SpeakingEvaluateDto {
  @IsString()
  @MinLength(10)
  transcript!: string;

  @IsString()
  @MinLength(3)
  topic!: string;

  @IsString()
  @MinLength(1)
  userId!: string;

  @Transform(({ value }) => normalizeProvider(value))
  @IsIn(["local_ollama", "paid_optional"])
  provider: "local_ollama" | "paid_optional" = "local_ollama";
}

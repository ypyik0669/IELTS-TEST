import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class UserQueryDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}

export class ListeningAttemptDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsInt()
  @Min(0)
  @Max(40)
  rawScore!: number;

  @IsInt()
  @Min(1)
  @Max(120)
  minutesUsed!: number;

  @IsInt()
  @Min(40)
  @Max(40)
  totalQuestions = 40;
}

export class ReadingAttemptDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsInt()
  @Min(0)
  @Max(40)
  rawScore!: number;

  @IsInt()
  @Min(1)
  @Max(120)
  minutesUsed!: number;

  @IsInt()
  @Min(40)
  @Max(40)
  totalQuestions = 40;
}

export class WritingAttemptDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(5)
  prompt!: string;

  @IsString()
  @MinLength(30)
  artifactId!: string;
}

export class SpeakingAttemptDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(3)
  topic!: string;

  @IsString()
  @MinLength(3)
  artifactId!: string;
}

export class RubricScoreDto {
  @IsString()
  @MinLength(1)
  criterion!: string;

  @Min(0)
  @Max(9)
  score!: number;

  @IsString()
  @MinLength(3)
  comment!: string;
}

export class AddRubricDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricScoreDto)
  scores!: RubricScoreDto[];
}

export class PlanRescheduleDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(3)
  taskId!: string;

  @IsDateString()
  newDate!: string;
}

export class NightlyChecklistDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsArray()
  @IsString({ each: true })
  tasks!: string[];
}

export class DueCardsQueryDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ReviewEventDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(1)
  cardId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  rating!: 1 | 2 | 3 | 4;
}

export class CrawlJobDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(10)
  sourceUrl!: string;
}

export class ImportContentDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(3)
  fileName!: string;
}

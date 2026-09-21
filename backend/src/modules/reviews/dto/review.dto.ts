import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReviewDto {
  /** The farmer being reviewed. An order can span several, so the buyer names one. */
  @IsString()
  farmerId!: string;

  /** Whole stars, 1 to 5, matching the CHECK constraint on the column. */
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  comment?: string;
}

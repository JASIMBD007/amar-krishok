import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class AddLotPhotoDto {
  @IsString()
  url!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  caption?: string;
}

export class UpdateLotPhotoDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  caption?: string;

  /** Promote this photo to the cover; the previous cover is demoted in the same transaction. */
  @IsBoolean()
  @IsOptional()
  isCover?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

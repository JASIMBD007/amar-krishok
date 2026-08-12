import { IsOptional, IsString, MaxLength } from "class-validator";

export class RecordPageViewDto {
  /** Pathname only. The server strips any query string it is sent anyway. */
  @IsString()
  @MaxLength(200)
  path!: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  referrer?: string;
}

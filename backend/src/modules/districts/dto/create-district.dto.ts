import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CreateDistrictDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

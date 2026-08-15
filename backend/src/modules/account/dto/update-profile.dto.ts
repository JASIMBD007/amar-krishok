import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  upazilla?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  identity?: string;

  @IsString()
  @IsOptional()
  nidNumber?: string;

  @IsString()
  @IsOptional()
  payoutProof?: string;

  @IsString()
  @IsOptional()
  focus?: string;

  @IsEmail()
  @ValidateIf((_object, value) => value !== "")
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

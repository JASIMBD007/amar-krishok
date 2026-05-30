import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateLotDto {
  @IsString()
  @IsOptional()
  farmerId?: string;

  @IsString()
  crop!: string;

  @IsString()
  district!: string;

  @IsNumber()
  @Min(0.01)
  quantityKg!: number;

  @IsNumber()
  @Min(0.01)
  pricePerKg!: number;

  @IsString()
  grade!: string;

  @IsDateString()
  @IsOptional()
  harvestDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

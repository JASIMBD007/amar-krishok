import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateLotDto {
  @IsString()
  @IsOptional()
  farmerId?: string;

  @IsString()
  crop!: string;

  @IsString()
  district!: string;

  @IsString()
  @IsNotEmpty()
  upazilla!: string;

  @IsNumber()
  @Min(0.01)
  quantityKg!: number;

  @IsNumber()
  @Min(0.01)
  pricePerKg!: number;

  @IsIn(["A", "B", "C"])
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

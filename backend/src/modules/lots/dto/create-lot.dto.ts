import { LotStatus } from "@prisma/client";
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

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

  @IsBoolean()
  @IsOptional()
  transportIncluded?: boolean;

  @IsBoolean()
  @IsOptional()
  pickupWithin24h?: boolean;
}

export class UpdateLotDto {
  @IsString()
  @IsOptional()
  crop?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  upazilla?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  quantityKg?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  pricePerKg?: number;

  @IsIn(["A", "B", "C"])
  @IsOptional()
  grade?: string;

  @IsDateString()
  @IsOptional()
  harvestDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  transportIncluded?: boolean;

  @IsBoolean()
  @IsOptional()
  pickupWithin24h?: boolean;
}

export class UpdateLotStatusDto {
  @IsIn([LotStatus.ACTIVE, LotStatus.CANCELLED])
  status!: LotStatus;
}

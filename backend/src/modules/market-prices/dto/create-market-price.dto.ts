import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateMarketPriceDto {
  @IsString()
  crop!: string;

  @IsString()
  district!: string;

  @IsNumber()
  @Min(0)
  farmerAsk!: number;

  @IsNumber()
  @Min(0)
  wholesale!: number;

  @IsNumber()
  @Min(0)
  retail!: number;

  @IsDateString()
  priceDate!: string;

  @IsString()
  @IsOptional()
  source?: string;
}

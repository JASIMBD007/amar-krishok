import { Type } from "class-transformer";
import { ArrayNotEmpty, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class CreateOrderItemDto {
  @IsString()
  crop!: string;

  @IsString()
  @IsOptional()
  cropLotId?: string;

  @IsNumber()
  @Min(0.01)
  quantityKg!: number;

  @IsNumber()
  @Min(0.01)
  offeredPricePerKg!: number;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  buyerId?: string;

  @IsString()
  district!: string;

  @IsString()
  @IsNotEmpty()
  upazilla!: string;

  @IsString()
  deliveryAddress!: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @ArrayNotEmpty()
  @Type(() => CreateOrderItemDto)
  @ValidateNested({ each: true })
  items!: CreateOrderItemDto[];
}

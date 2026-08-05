import { Type } from "class-transformer";
import { ArrayNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class PublishRateDto {
  @IsString()
  crop!: string;

  /**
   * The district wholesale rate in ৳ per mon (1 mon = 40 kg), which is how wholesale markets in
   * Bangladesh quote. The service converts to the per-kg columns the MarketPrice table stores.
   */
  @IsNumber()
  @Min(0)
  ratePerMon!: number;
}

export class PublishRatesDto {
  /** Omit to publish a national benchmark rate that every district falls back to. */
  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @ArrayNotEmpty()
  @Type(() => PublishRateDto)
  @ValidateNested({ each: true })
  rates!: PublishRateDto[];
}

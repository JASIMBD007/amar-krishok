import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateLotOfferDto {
  @IsString()
  cropLotId!: string;

  /** Offers are quoted per kg so they stay in the same unit as the lot's asking price. */
  @IsNumber()
  @Min(0.01)
  pricePerKg!: number;

  @IsString()
  @IsOptional()
  @MaxLength(280)
  note?: string;
}

export class RespondToLotOfferDto {
  @IsIn(["accept", "decline"])
  action!: "accept" | "decline";
}

import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Staff decisions on a held escrow balance. The five buyer-facing stages map onto OrderStatus
 * (see escrow.ts) so the lifecycle stays in one place rather than a parallel column that can drift.
 */
export class EscrowDecisionDto {
  @IsIn(["release", "refund"])
  action!: "release" | "refund";

  @IsString()
  @IsOptional()
  @MaxLength(280)
  reason?: string;
}

export class DisputeDecisionDto {
  @IsIn(["open", "close"])
  action!: "open" | "close";

  @IsString()
  @IsOptional()
  @MaxLength(280)
  reason?: string;
}

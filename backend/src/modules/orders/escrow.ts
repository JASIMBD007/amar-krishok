import { OrderStatus } from "@prisma/client";

/**
 * The buyer-facing escrow timeline. Five steps, mapped onto OrderStatus so the lifecycle lives in
 * one place rather than in a parallel column that can drift out of sync.
 */
export const ESCROW_STAGES: OrderStatus[] = [
  OrderStatus.MATCHING,
  OrderStatus.PICKUP_BOOKED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.COMPLETED,
];

export const PLATFORM_FEE_RATE = 0.01;

/** 1-based stage number for the timeline. PENDING is treated as stage 1 alongside MATCHING. */
export function stageOf(status: OrderStatus) {
  if (status === OrderStatus.PENDING) {
    return 1;
  }

  if (status === OrderStatus.CANCELLED) {
    return 1;
  }

  const index = ESCROW_STAGES.indexOf(status);
  return index === -1 ? 1 : index + 1;
}

export function nextStatusAfter(status: OrderStatus): OrderStatus | null {
  const stage = stageOf(status);
  if (stage >= ESCROW_STAGES.length) {
    return null;
  }

  return ESCROW_STAGES[stage];
}

export function platformFeeFor(cropValue: number) {
  return Math.round(cropValue * PLATFORM_FEE_RATE);
}

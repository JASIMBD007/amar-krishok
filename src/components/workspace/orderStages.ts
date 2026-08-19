import type { BackendOrder } from "../../api/auth";

/**
 * How an order's status becomes a stage, an escrow state and a reference. One module, so the order
 * table, the tracking page and both dashboards can never label the same order differently.
 */

/** The five buyer-facing escrow stages, mapped from the order status the backend keeps. */
const STAGE_BY_STATUS: Record<string, number> = {
  COMPLETED: 5,
  IN_TRANSIT: 3,
  MATCHING: 1,
  PENDING: 1,
  PICKUP_BOOKED: 2,
  QUALITY_CHECK: 4,
};

export const STAGE_LABEL: Record<number, string> = {
  1: "Confirmed",
  2: "Pickup scheduled",
  3: "In transit",
  4: "Delivered",
  5: "Paid",
};

export function stageOfOrder(order: BackendOrder) {
  return STAGE_BY_STATUS[order.status.toUpperCase()] ?? 1;
}

export function escrowStateOf(order: BackendOrder) {
  const payments = order.payments ?? [];
  if (payments.some((payment) => payment.status === "REFUNDED")) {
    return "refunded" as const;
  }

  if (payments.some((payment) => payment.status === "RELEASED")) {
    return "released" as const;
  }

  return "held" as const;
}

/**
 * The reference shown for an order everywhere in the app. Orders do not carry an AK-#### code column
 * on this table yet, so the last eight characters of the id are the platform-wide reference.
 */
export function orderReference(order: Pick<BackendOrder, "id">) {
  return order.id.slice(-8).toUpperCase();
}

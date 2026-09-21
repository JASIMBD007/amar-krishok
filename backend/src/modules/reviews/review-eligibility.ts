import { OrderStatus, Role } from "@prisma/client";

/** The order facts the rules need, so they can be checked without a database. */
export type ReviewableOrder = {
  buyerId: string;
  status: OrderStatus;
  items: Array<{ cropLot: { farmerId: string } | null }>;
};

export type Reviewer = { id: string; role: Role };

export type EligibilityRefusal =
  | "NOT_THE_BUYER"
  | "ORDER_NOT_COMPLETED"
  | "FARMER_NOT_ON_ORDER"
  | "ALREADY_REVIEWED";

export const REFUSAL_MESSAGES: Record<EligibilityRefusal, string> = {
  ALREADY_REVIEWED: "You have already reviewed this farmer for this order.",
  FARMER_NOT_ON_ORDER: "That farmer did not supply anything on this order.",
  NOT_THE_BUYER: "Only the buyer on an order can review it.",
  ORDER_NOT_COMPLETED: "An order can be reviewed once it has completed.",
};

/** The farmers who actually supplied something, deduplicated. */
export function farmersOnOrder(order: ReviewableOrder): string[] {
  return [...new Set(order.items.map((item) => item.cropLot?.farmerId).filter((id): id is string => Boolean(id)))];
}

/**
 * Whether a reviewer may rate one farmer on one order.
 *
 * A rating is a claim about a real transaction, so all four conditions have to hold: the order
 * completed, the reviewer is its buyer, the farmer actually supplied part of it, and they have not
 * already been rated for it. Without the third check a buyer could rate any farmer on the platform
 * off the back of a single unrelated order.
 *
 * Staff are exempt from the buyer check so they can correct a record on a buyer's behalf, and the
 * transaction checks still apply to them.
 */
export function reviewRefusal(
  order: ReviewableOrder,
  farmerId: string,
  reviewer: Reviewer,
  alreadyReviewed: boolean,
): EligibilityRefusal | null {
  if (reviewer.role !== Role.ADMIN && order.buyerId !== reviewer.id) {
    return "NOT_THE_BUYER";
  }

  if (order.status !== OrderStatus.COMPLETED) {
    return "ORDER_NOT_COMPLETED";
  }

  if (!farmersOnOrder(order).includes(farmerId)) {
    return "FARMER_NOT_ON_ORDER";
  }

  if (alreadyReviewed) {
    return "ALREADY_REVIEWED";
  }

  return null;
}

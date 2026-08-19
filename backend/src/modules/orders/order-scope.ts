import { Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";

/**
 * Who may see which orders. One place, because the answer has to be identical on the order list, on
 * either dashboard aggregate and on any single-order read: a buyer sees the orders they placed, a
 * farmer sees the orders raised against their own lots, and staff see the whole book.
 *
 * An unscoped farmer query is the defect this function exists to make impossible — it made one
 * buyer's order appear as every farmer's income.
 */
export function ordersVisibleTo(user: AuthenticatedUser, buyerIdFilter?: string): Prisma.LegacyOrderWhereInput {
  if (user.role === Role.BUYER) {
    return { buyerId: user.id };
  }

  if (user.role === Role.FARMER) {
    return { items: { some: { cropLot: { farmerId: user.id } } } };
  }

  return buyerIdFilter ? { buyerId: buyerIdFilter } : {};
}

/** Orders belonging to one buyer, for the buyer dashboard. */
export function buyerOrderScope(buyerId: string): Prisma.LegacyOrderWhereInput {
  return { buyerId };
}

/** Orders carrying at least one of this farmer's lots, for the farmer dashboard. */
export function farmerOrderScope(farmerId: string): Prisma.LegacyOrderWhereInput {
  return { items: { some: { cropLot: { farmerId } } } };
}

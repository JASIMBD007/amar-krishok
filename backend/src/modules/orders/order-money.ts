import { Prisma } from "@prisma/client";

/**
 * The three-way split of an order, in one place.
 *
 * An order total is `cropTotal + transportAmount + feeAmount`. The farmer earns the crop subtotal,
 * the carrier earns the transport, the platform keeps the fee, and the three add back up to exactly
 * what the buyer paid. The platform fee sits on the buyer's bill rather than being taken out of the
 * farmer's money, which is what escrow actually releases.
 *
 * Every figure reads `feeAmount` and `transportAmount` off the order. Never multiply a fee rate back
 * in: the rate charged at checkout can change without these figures being wrong for older orders.
 */

export type OrderMoneyRow = {
  cropTotal: Prisma.Decimal | number | string;
  feeAmount: Prisma.Decimal | number | string;
  transportAmount: Prisma.Decimal | number | string;
  totalValue: Prisma.Decimal | number | string;
};

export type OrderItemRow = {
  cropLot?: { farmerId: string } | null;
  offeredPricePerKg: Prisma.Decimal | number | string;
  quantityKg: Prisma.Decimal | number | string;
};

export function amount(value: Prisma.Decimal | number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The crop subtotal, excluding transport and the platform fee. The rate comparison uses only this. */
export function cropSubtotal(order: OrderMoneyRow & { items?: OrderItemRow[] }) {
  const stored = amount(order.cropTotal);
  if (stored > 0) {
    return stored;
  }

  // Orders placed before the split was persisted: recover the subtotal from the items rather than
  // reverse-engineering it out of the total, which would fold transport back into the crop price.
  return itemsSubtotal(order.items ?? []);
}

export function itemsSubtotal(items: OrderItemRow[]) {
  return items.reduce((total, item) => total + amount(item.quantityKg) * amount(item.offeredPricePerKg), 0);
}

/** What the buyer paid. Their escrow and spend figures are the gross, because that is what left them. */
export function buyerGross(order: OrderMoneyRow & { items?: OrderItemRow[] }) {
  const stored = amount(order.totalValue);
  if (stored > 0) {
    return stored;
  }

  return cropSubtotal(order) + amount(order.transportAmount) + amount(order.feeAmount);
}

/**
 * What one farmer earns on an order: their own lots' share of the crop subtotal. Apportioning by each
 * farmer's own lot value keeps the invariant that every farmer share plus the carrier's transport plus
 * the platform fee adds back up to the order total, whether the order covers one lot or several.
 */
export function farmerShare(order: OrderMoneyRow & { items: OrderItemRow[] }, farmerId: string) {
  const subtotal = cropSubtotal(order);
  const itemTotal = itemsSubtotal(order.items);
  const mine = itemsSubtotal(order.items.filter((item) => item.cropLot?.farmerId === farmerId));

  if (itemTotal <= 0 || mine <= 0) {
    return 0;
  }

  // Scale to the stored subtotal so rounding on the order does not land on one farmer.
  return subtotal * (mine / itemTotal);
}

/** The carrier's slice. Never shown to the farmer or the buyer as theirs. */
export function carrierShare(order: OrderMoneyRow) {
  return amount(order.transportAmount);
}

/** The platform's slice, as charged. */
export function platformShare(order: OrderMoneyRow) {
  return amount(order.feeAmount);
}

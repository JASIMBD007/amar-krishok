import { ConflictException } from "@nestjs/common";
import { LotStatus, Prisma } from "@prisma/client";

/**
 * The slice of the Prisma client this needs, so a test can hand it a fake and so the caller can
 * pass either the client or a transaction handle.
 */
export type LotReservationClient = {
  cropLot: {
    updateMany(args: {
      data: { quantityKg: { decrement: Prisma.Decimal } };
      where: { id: string; quantityKg: { gte: Prisma.Decimal }; status: LotStatus };
    }): Promise<{ count: number }>;
    findUnique(args: { select: { quantityKg: true }; where: { id: string } }): Promise<{ quantityKg: Prisma.Decimal } | null>;
    update(args: { data: { status: LotStatus }; where: { id: string } }): Promise<unknown>;
  };
};

export const LOT_UNAVAILABLE_MESSAGE = "That lot does not have enough left. Reload the marketplace and try again.";

/**
 * Takes quantity off a lot as part of placing an order.
 *
 * The decrement is a conditional updateMany rather than a read followed by a write: the quantity and
 * status checks live in the WHERE clause, so Postgres evaluates them against the row it is about to
 * update. Two buyers ordering the last of a lot at the same time therefore cannot both succeed, the
 * second one matches nothing and gets a conflict. A read-then-write would let both pass the check
 * before either wrote, which is how the same lot used to be sellable without limit.
 *
 * Callers must pass a transaction handle, so a failure here rolls the order and its escrow back.
 */
export async function reserveLotQuantity(tx: LotReservationClient, cropLotId: string, quantityKg: number): Promise<void> {
  const requested = new Prisma.Decimal(quantityKg);

  const reserved = await tx.cropLot.updateMany({
    data: { quantityKg: { decrement: requested } },
    where: { id: cropLotId, quantityKg: { gte: requested }, status: LotStatus.ACTIVE },
  });

  if (reserved.count !== 1) {
    throw new ConflictException(LOT_UNAVAILABLE_MESSAGE);
  }

  // A lot drawn down to nothing stops being an offer, so it leaves the marketplace as sold rather
  // than sitting there at zero. A partial draw stays ACTIVE so the rest of the harvest can still go.
  const remaining = await tx.cropLot.findUnique({ select: { quantityKg: true }, where: { id: cropLotId } });

  if (remaining && new Prisma.Decimal(remaining.quantityKg).lte(0)) {
    await tx.cropLot.update({ data: { status: LotStatus.SOLD }, where: { id: cropLotId } });
  }
}

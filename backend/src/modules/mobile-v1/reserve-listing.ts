import { ConflictException } from "@nestjs/common";
import { ListingStatus } from "@prisma/client";

/** The slice of the client this needs, so a test can hand it a fake. */
export type ListingReservationClient = {
  listing: {
    updateMany(args: {
      data: { quantity: { decrement: number } };
      where: { id: string; quantity: { gte: number }; status: ListingStatus };
    }): Promise<{ count: number }>;
    findUnique(args: { select: { quantity: true }; where: { id: string } }): Promise<{ quantity: number } | null>;
    update(args: { data: { status: ListingStatus }; where: { id: string } }): Promise<unknown>;
  };
};

export const LISTING_UNAVAILABLE = {
  error: {
    code: "INSUFFICIENT_QUANTITY",
    message: "The requested quantity is unavailable.",
    messageBn: "চাহিদামতো পরিমাণ পাওয়া যাচ্ছে না।",
  },
};

/**
 * Takes mon off a listing as part of placing an order.
 *
 * The sibling of reserveLotQuantity on the website's CropLot, and it exists for the same reason:
 * ordering used to check the quantity and then never decrement it, so one listing could be sold
 * repeatedly, each sale opening its own Escrow row against produce already committed elsewhere.
 * The check also sat outside the transaction, which made it a plain read-then-write race.
 *
 * The decrement is a conditional updateMany with the quantity and status predicates in the WHERE
 * clause, so Postgres evaluates them against the row it is about to write and two buyers cannot
 * both take the last of a listing. Callers must pass a transaction handle so a refusal rolls back
 * the order, its escrow and its thread together.
 *
 * Quantity is whole mon here, unlike the website's decimal kilograms.
 */
export async function reserveListingQuantity(
  tx: ListingReservationClient,
  listingId: string,
  quantityMon: number,
): Promise<void> {
  const reserved = await tx.listing.updateMany({
    data: { quantity: { decrement: quantityMon } },
    where: { id: listingId, quantity: { gte: quantityMon }, status: ListingStatus.LIVE },
  });

  if (reserved.count !== 1) {
    throw new ConflictException(LISTING_UNAVAILABLE);
  }

  // A listing drawn down to nothing stops being an offer. ListingStatus has no RESERVED, so SOLD is
  // the terminal state; a partial draw stays LIVE so the rest of the harvest can still go.
  const remaining = await tx.listing.findUnique({ select: { quantity: true }, where: { id: listingId } });

  if (remaining && remaining.quantity <= 0) {
    await tx.listing.update({ data: { status: ListingStatus.SOLD }, where: { id: listingId } });
  }
}

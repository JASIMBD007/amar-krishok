import { OrderStatus } from "@prisma/client";

/** What the marketplace shows about a farmer's track record. Absent rating means nobody has rated them. */
export type FarmerReputation = {
  rating: number | null;
  reviewCount: number;
  completedOrders: number;
};

export const NO_REPUTATION: FarmerReputation = { completedOrders: 0, rating: null, reviewCount: 0 };

/**
 * The slice of the client this needs, so a test can hand it a fake.
 */
export type ReputationClient = {
  review: {
    groupBy(args: {
      by: ["revieweeId"];
      where: { hiddenAt: null; revieweeId: { in: string[] } };
      _avg: { rating: true };
      _count: { rating: true };
    }): Promise<Array<{ revieweeId: string; _avg: { rating: number | null }; _count: { rating: number } }>>;
  };
  orderItem: {
    findMany(args: {
      where: { cropLot: { farmerId: { in: string[] } }; order: { status: OrderStatus } };
      select: { orderId: true; cropLot: { select: { farmerId: true } } };
    }): Promise<Array<{ orderId: string; cropLot: { farmerId: string } | null }>>;
  };
};

/** Two decimals, so 4.333... reads as 4.33 rather than implying precision nobody measured. */
function roundRating(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Reads the real reputation of a set of farmers in two queries.
 *
 * Hidden reviews are excluded from both the average and the count, so a review staff pulled stops
 * counting rather than silently skewing a score nobody can see.
 *
 * Completed orders are counted distinctly per farmer: one order can contain several of a farmer's
 * lots, and that is one order fulfilled, not three. The distinct pass happens here rather than in
 * SQL because this codebase stays on Prisma's query API. At marketplace-page sizes that is a few
 * hundred rows; if listing volume grows this is the thing to denormalise onto the farmer row.
 */
export async function farmerReputations(
  client: ReputationClient,
  farmerIds: string[],
): Promise<Map<string, FarmerReputation>> {
  const reputations = new Map<string, FarmerReputation>();
  const uniqueFarmerIds = [...new Set(farmerIds.filter(Boolean))];

  if (uniqueFarmerIds.length === 0) {
    return reputations;
  }

  const [ratings, completedItems] = await Promise.all([
    client.review.groupBy({
      _avg: { rating: true },
      _count: { rating: true },
      by: ["revieweeId"],
      where: { hiddenAt: null, revieweeId: { in: uniqueFarmerIds } },
    }),
    client.orderItem.findMany({
      select: { cropLot: { select: { farmerId: true } }, orderId: true },
      where: { cropLot: { farmerId: { in: uniqueFarmerIds } }, order: { status: OrderStatus.COMPLETED } },
    }),
  ]);

  const ordersByFarmer = new Map<string, Set<string>>();
  for (const item of completedItems) {
    const farmerId = item.cropLot?.farmerId;
    if (!farmerId) {
      continue;
    }

    const orders = ordersByFarmer.get(farmerId) ?? new Set<string>();
    orders.add(item.orderId);
    ordersByFarmer.set(farmerId, orders);
  }

  const ratingsByFarmer = new Map(ratings.map((row) => [row.revieweeId, row]));

  for (const farmerId of uniqueFarmerIds) {
    const rating = ratingsByFarmer.get(farmerId);
    const reviewCount = rating?._count.rating ?? 0;

    reputations.set(farmerId, {
      completedOrders: ordersByFarmer.get(farmerId)?.size ?? 0,
      // A group with no rows never comes back, and an average over zero rows is null, so both
      // paths land on null rather than on a zero that would render as a nought-star seller.
      rating: reviewCount > 0 && rating?._avg.rating !== null && rating?._avg.rating !== undefined ? roundRating(rating._avg.rating) : null,
      reviewCount,
    });
  }

  return reputations;
}

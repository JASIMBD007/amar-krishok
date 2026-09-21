import { OrderStatus, Role } from "@prisma/client";
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";

import { NO_REPUTATION, farmerReputations, type ReputationClient } from "./farmer-reputation";
import { farmersOnOrder, reviewRefusal, type ReviewableOrder, type Reviewer } from "./review-eligibility";

/**
 * Reputation used to be synthesised from a checksum of the lot id, so one farmer showed a different
 * score on every lot. These cover the two things that keep the replacement honest: only a real
 * counterparty to a completed order can write a rating, and the published average counts exactly
 * the reviews that are visible.
 */

const BUYER: Reviewer = { id: "buyer-rafiq", role: Role.BUYER };
const OTHER_BUYER: Reviewer = { id: "buyer-nasrin", role: Role.BUYER };
const STAFF: Reviewer = { id: "admin-tuhin", role: Role.ADMIN };
const FARMER = "farmer-rahim";
const OTHER_FARMER = "farmer-sultana";

function order(overrides: Partial<ReviewableOrder> = {}): ReviewableOrder {
  return {
    buyerId: BUYER.id,
    items: [{ cropLot: { farmerId: FARMER } }],
    status: OrderStatus.COMPLETED,
    ...overrides,
  };
}

test("the buyer on a completed order may rate the farmer who supplied it", () => {
  equal(reviewRefusal(order(), FARMER, BUYER, false), null);
});

test("a buyer who was not on the order is refused", () => {
  equal(reviewRefusal(order(), FARMER, OTHER_BUYER, false), "NOT_THE_BUYER");
});

test("an order that has not completed cannot be rated", () => {
  for (const status of [OrderStatus.PENDING, OrderStatus.MATCHING, OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED]) {
    equal(reviewRefusal(order({ status }), FARMER, BUYER, false), "ORDER_NOT_COMPLETED");
  }
});

test("a farmer who supplied nothing on the order cannot be rated through it", () => {
  // Without this check one completed order would license a buyer to rate the whole platform.
  equal(reviewRefusal(order(), OTHER_FARMER, BUYER, false), "FARMER_NOT_ON_ORDER");
});

test("a farmer cannot be rated twice for the same order", () => {
  equal(reviewRefusal(order(), FARMER, BUYER, true), "ALREADY_REVIEWED");
});

test("staff may record a review for the buyer, but the transaction rules still bind", () => {
  equal(reviewRefusal(order(), FARMER, STAFF, false), null);
  equal(reviewRefusal(order({ status: OrderStatus.PENDING }), FARMER, STAFF, false), "ORDER_NOT_COMPLETED");
  equal(reviewRefusal(order(), OTHER_FARMER, STAFF, false), "FARMER_NOT_ON_ORDER");
});

test("an order spanning several farmers is reviewable per farmer", () => {
  const shared = order({
    items: [{ cropLot: { farmerId: FARMER } }, { cropLot: { farmerId: OTHER_FARMER } }, { cropLot: null }],
  });

  deepEqual(farmersOnOrder(shared), [FARMER, OTHER_FARMER]);
  equal(reviewRefusal(shared, FARMER, BUYER, false), null);
  equal(reviewRefusal(shared, OTHER_FARMER, BUYER, false), null);
});

test("two lots from one farmer on one order count as one farmer", () => {
  const doubled = order({ items: [{ cropLot: { farmerId: FARMER } }, { cropLot: { farmerId: FARMER } }] });

  deepEqual(farmersOnOrder(doubled), [FARMER]);
});

function reputationClient(
  ratings: Array<{ revieweeId: string; avg: number | null; count: number }>,
  completedItems: Array<{ orderId: string; farmerId: string | null }>,
) {
  const queries: string[] = [];

  const client: ReputationClient = {
    review: {
      async groupBy({ where }) {
        queries.push("groupBy");
        return ratings
          .filter((row) => where.revieweeId.in.includes(row.revieweeId))
          .map((row) => ({ _avg: { rating: row.avg }, _count: { rating: row.count }, revieweeId: row.revieweeId }));
      },
    },
    orderItem: {
      async findMany({ where }) {
        queries.push("findMany");
        return completedItems
          .filter((item) => item.farmerId && where.cropLot.farmerId.in.includes(item.farmerId))
          .map((item) => ({ cropLot: item.farmerId ? { farmerId: item.farmerId } : null, orderId: item.orderId }));
      },
    },
  };

  return { client, queries };
}

test("an unrated farmer comes back with a null rating, not a zero", async () => {
  // A zero would render as a nought-star seller, which is a verdict nobody gave.
  const { client } = reputationClient([], []);

  const reputations = await farmerReputations(client, [FARMER]);

  deepEqual(reputations.get(FARMER), NO_REPUTATION);
  equal(reputations.get(FARMER)?.rating, null);
});

test("the published rating is the average of visible reviews, to two places", async () => {
  const { client } = reputationClient([{ avg: 4.333333, count: 3, revieweeId: FARMER }], []);

  const reputations = await farmerReputations(client, [FARMER]);

  equal(reputations.get(FARMER)?.rating, 4.33);
  equal(reputations.get(FARMER)?.reviewCount, 3);
});

test("hidden reviews are excluded by the query the aggregate issues", async () => {
  const { client } = reputationClient([{ avg: 5, count: 1, revieweeId: FARMER }], []);
  let seenWhere: unknown;
  const original = client.review.groupBy;
  client.review.groupBy = async (args) => {
    seenWhere = args.where;
    return original(args);
  };

  await farmerReputations(client, [FARMER]);

  deepEqual(seenWhere, { hiddenAt: null, revieweeId: { in: [FARMER] } });
});

test("several lots from one farmer on one order count as one completed order", async () => {
  const { client } = reputationClient([], [
    { farmerId: FARMER, orderId: "order-1" },
    { farmerId: FARMER, orderId: "order-1" },
    { farmerId: FARMER, orderId: "order-2" },
  ]);

  const reputations = await farmerReputations(client, [FARMER]);

  equal(reputations.get(FARMER)?.completedOrders, 2);
});

test("one farmer's orders never count towards another's", async () => {
  const { client } = reputationClient(
    [{ avg: 4, count: 2, revieweeId: FARMER }],
    [
      { farmerId: FARMER, orderId: "order-1" },
      { farmerId: OTHER_FARMER, orderId: "order-2" },
      { farmerId: OTHER_FARMER, orderId: "order-3" },
    ],
  );

  const reputations = await farmerReputations(client, [FARMER, OTHER_FARMER]);

  equal(reputations.get(FARMER)?.completedOrders, 1);
  equal(reputations.get(FARMER)?.rating, 4);
  equal(reputations.get(OTHER_FARMER)?.completedOrders, 2);
  equal(reputations.get(OTHER_FARMER)?.rating, null);
});

test("a marketplace page costs two queries regardless of how many farmers it shows", async () => {
  const { client, queries } = reputationClient([], []);

  await farmerReputations(client, [FARMER, OTHER_FARMER, "farmer-c", "farmer-d", FARMER]);

  equal(queries.length, 2);
});

test("no farmers means no queries at all", async () => {
  const { client, queries } = reputationClient([], []);

  const reputations = await farmerReputations(client, []);

  equal(reputations.size, 0);
  equal(queries.length, 0);
});

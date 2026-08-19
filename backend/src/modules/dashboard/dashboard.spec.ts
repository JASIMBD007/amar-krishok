import { Prisma, Role } from "@prisma/client";
import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";

import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { carrierShare, farmerShare, platformShare } from "../orders/order-money";
import { farmerOrderScope, ordersVisibleTo } from "../orders/order-scope";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardService } from "./dashboard.service";

/**
 * These cover the defects DASHBOARDS.md §4 says took four review rounds to kill: money leaking across
 * farmers, the three-way split, a fee rate hardcoded instead of read, a rate comparison that folded
 * transport and the fee into the crop price, index-bucketed charts, and empty states that still
 * asserted a statistic.
 *
 * The split follows the resolved reading of §4b: the platform fee is on the buyer's bill, so the
 * farmer's slice is their lots' crop value, and farmer + carrier + platform is exactly the total.
 */

const ONE_FARMER = "farmer-rahim";
const OTHER_FARMER = "farmer-sultana";
const BUYER = "buyer-rafiq";

const decimal = (value: number) => new Prisma.Decimal(value);

type FakeOrder = {
  id: string;
  buyerId: string;
  createdAt: Date;
  cropTotal: Prisma.Decimal;
  transportAmount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  totalValue: Prisma.Decimal;
  paymentMethod: string | null;
  status: string;
  district: { name: string };
  items: Array<{
    crop: { name: string };
    cropLot: { district: { name: string }; farmerId: string; id: string } | null;
    offeredPricePerKg: Prisma.Decimal;
    quantityKg: Prisma.Decimal;
  }>;
  payments: Array<{ status: string }>;
};

/**
 * One order per farmer, priced so the district rate comparison has an unambiguous answer: 100 mon of
 * potato at ৳ 20/kg against a published ৳ 21/kg, plus transport and a fee that must stay out of it.
 */
function orderFor(farmerId: string, overrides: Partial<FakeOrder> = {}): FakeOrder {
  const cropTotal = 80_000; // 4,000 kg × ৳ 20
  const transport = 7_800;
  const fee = 1_200;

  return {
    id: `order-${farmerId}`,
    buyerId: BUYER,
    createdAt: new Date("2026-08-19T04:00:00.000Z"),
    cropTotal: decimal(cropTotal),
    transportAmount: decimal(transport),
    feeAmount: decimal(fee),
    totalValue: decimal(cropTotal + transport + fee),
    paymentMethod: "bKash",
    status: "IN_TRANSIT",
    district: { name: "Bogura" },
    items: [
      {
        crop: { name: "Potato" },
        cropLot: { district: { name: "Bogura" }, farmerId, id: `lot-${farmerId}` },
        offeredPricePerKg: decimal(20),
        quantityKg: decimal(4_000),
      },
    ],
    payments: [{ status: "HELD" }],
    ...overrides,
  };
}

/**
 * A Prisma stand-in that actually applies the `where` clauses the service builds, so a test proving
 * one farmer cannot see another's money is proving the query, not the fixture.
 */
function fakePrisma(orders: FakeOrder[]) {
  const matches = (order: FakeOrder, where: Prisma.LegacyOrderWhereInput | undefined): boolean => {
    if (!where) {
      return true;
    }

    if (where.buyerId && where.buyerId !== order.buyerId) {
      return false;
    }

    const farmerId = where.items?.some?.cropLot?.farmerId;
    if (farmerId && !order.items.some((item) => item.cropLot?.farmerId === farmerId)) {
      return false;
    }

    const paymentStatus = where.payments?.some?.status;
    if (paymentStatus && !order.payments.some((payment) => payment.status === paymentStatus)) {
      return false;
    }

    return true;
  };

  return {
    cropLot: { findMany: async () => [] },
    legacyOrder: {
      findMany: async ({ where }: { where?: Prisma.LegacyOrderWhereInput }) => orders.filter((order) => matches(order, where)),
    },
    legacyPayout: { findMany: async () => [] },
    legacyUser: {
      findMany: async () => [{ id: ONE_FARMER, name: "Rahim Uddin" }],
      findUniqueOrThrow: async () => ({
        district: { name: "Bogura" },
        name: "Rahim Uddin",
        role: Role.FARMER,
        upazilla: "Shibganj",
        verifiedAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
    },
    lotOffer: { findMany: async () => [] },
    // The published district rate for the order's crop, district and day: ৳ 21/kg wholesale.
    marketPrice: {
      findFirst: async () => ({ priceDate: new Date("2026-08-19T00:00:00.000Z") }),
      findMany: async () => [
        {
          crop: { name: "Potato" },
          district: { name: "Bogura" },
          priceDate: new Date("2026-08-19T00:00:00.000Z"),
          wholesale: decimal(21),
        },
      ],
    },
    payoutAccount: { findFirst: async () => null },
  } as unknown as PrismaService;
}

const asFarmer = (id: string): AuthenticatedUser =>
  ({ id, name: "Rahim Uddin", role: Role.FARMER }) as AuthenticatedUser;
const asBuyer = (id: string): AuthenticatedUser => ({ id, name: "Rafiq Traders", role: Role.BUYER }) as AuthenticatedUser;

test("a farmer's dashboard excludes another farmer's orders", async () => {
  const service = new DashboardService(fakePrisma([orderFor(ONE_FARMER), orderFor(OTHER_FARMER)]));

  const mine = await service.farmerDashboard(asFarmer(ONE_FARMER));

  // One order, not two: the other farmer's money must not appear as this farmer's income.
  equal(mine.kpis.saleCount, 1);
  equal(mine.kpis.liveOrderCount, 1);
  equal(mine.daySeries.length, 1);
  // Their lots' crop value. Not the 89,000 gross the buyer paid, and not twice over.
  equal(mine.kpis.inEscrow, 80_000);
  equal(mine.kpis.season, 80_000);
});

test("the farmer's scope is a query filter, not a post-filter", () => {
  deepEqual(ordersVisibleTo(asFarmer(ONE_FARMER)), farmerOrderScope(ONE_FARMER));
  deepEqual(ordersVisibleTo(asBuyer(BUYER)), { buyerId: BUYER });
  // Staff see the whole book; nobody else gets an unscoped query.
  deepEqual(ordersVisibleTo({ id: "staff", name: "Staff", role: Role.ADMIN } as AuthenticatedUser), {});
});

test("the farmer share, the carrier's transport and the platform fee sum to the order total", () => {
  const order = orderFor(ONE_FARMER);

  const total = farmerShare(order, ONE_FARMER) + carrierShare(order) + platformShare(order);

  equal(Math.round(total), Number(order.totalValue));
});

test("a multi-farmer order splits the crop subtotal without losing the total", () => {
  const order = orderFor(ONE_FARMER, {
    cropTotal: decimal(120_000),
    feeAmount: decimal(1_800),
    transportAmount: decimal(7_800),
    totalValue: decimal(129_600),
    items: [
      {
        crop: { name: "Potato" },
        cropLot: { district: { name: "Bogura" }, farmerId: ONE_FARMER, id: "lot-a" },
        offeredPricePerKg: decimal(20),
        quantityKg: decimal(4_000),
      },
      {
        crop: { name: "Onion" },
        cropLot: { district: { name: "Bogura" }, farmerId: OTHER_FARMER, id: "lot-b" },
        offeredPricePerKg: decimal(20),
        quantityKg: decimal(2_000),
      },
    ],
  });

  const shares = farmerShare(order, ONE_FARMER) + farmerShare(order, OTHER_FARMER);

  equal(Math.round(shares + carrierShare(order) + platformShare(order)), Number(order.totalValue));
  // Each farmer keeps their own lot's value, apportioned from the stored subtotal. Nothing else.
  equal(Math.round(farmerShare(order, ONE_FARMER)), 80_000);
  equal(Math.round(farmerShare(order, OTHER_FARMER)), 40_000);
});

test("the platform fee is read off the order, never a rate multiplied back in", () => {
  // Two orders with the same crop subtotal, charged at 1 % and at 1,5 %. The platform's slice has to
  // follow the stored figure; a hardcoded multiplier would report the same fee for both.
  const atOnePercent = orderFor(ONE_FARMER, { feeAmount: decimal(800), totalValue: decimal(88_600) });
  const atOneAndAHalf = orderFor(ONE_FARMER, { feeAmount: decimal(1_200), totalValue: decimal(89_000) });

  equal(platformShare(atOnePercent), 800);
  equal(platformShare(atOneAndAHalf), 1_200);
  // And the farmer's slice is unchanged either way, because the fee is not taken out of it.
  equal(Math.round(farmerShare(atOnePercent, ONE_FARMER)), 80_000);
  equal(Math.round(farmerShare(atOneAndAHalf, ONE_FARMER)), 80_000);
  // Each still sums back to what its own buyer paid.
  for (const order of [atOnePercent, atOneAndAHalf]) {
    equal(
      Math.round(farmerShare(order, ONE_FARMER) + carrierShare(order) + platformShare(order)),
      Number(order.totalValue),
    );
  }
});

test("saved vs. district rate compares the crop subtotal only", async () => {
  const service = new DashboardService(fakePrisma([orderFor(ONE_FARMER)]));

  const buying = await service.buyerDashboard(asBuyer(BUYER));

  // 4,000 kg at the published ৳ 21 is ৳ 84,000; the crop actually cost ৳ 80,000.
  equal(buying.kpis.savedVsRate, 4_000);
  // −4.8 % on the crop. Folding in transport and the fee would have reported +5.9 % instead, which is
  // the exact contradiction the lot page's own fair-price badge caught.
  equal(buying.kpis.savedVsRateDelta, -4.8);
  equal(buying.kpis.comparedOrderCount, 1);
});

test("the buyer's escrow and spend are the gross they paid, not the farmer's share", async () => {
  const service = new DashboardService(fakePrisma([orderFor(ONE_FARMER)]));

  const buying = await service.buyerDashboard(asBuyer(BUYER));

  equal(buying.kpis.heldInEscrow, 89_000);
  // The next movement names the farmer's share, because that is the money that moves next.
  equal(buying.nextMovement?.amount, 80_000);
});

test("the by-crop breakdown excludes transport and the platform fee", async () => {
  const service = new DashboardService(fakePrisma([orderFor(ONE_FARMER)]));

  const buying = await service.buyerDashboard(asBuyer(BUYER));

  deepEqual(buying.byCrop, [{ crop: "Potato", value: 80_000 }]);
});

test("with no orders every panel is empty and no figure asserts a statistic", async () => {
  const service = new DashboardService(fakePrisma([]));

  const [selling, buying] = await Promise.all([
    service.farmerDashboard(asFarmer(ONE_FARMER)),
    service.buyerDashboard(asBuyer(BUYER)),
  ]);

  equal(selling.kpis.season, 0);
  equal(selling.kpis.inEscrow, 0);
  equal(selling.daySeries.length, 0);
  equal(selling.tradingDays, 0);
  equal(selling.nextMovement, null);
  deepEqual(selling.ledger, []);
  // Every empty dashboard still generates the one task that gets the user started.
  ok(selling.tasks.some((task) => task.action === "post"));

  equal(buying.kpis.heldInEscrow, 0);
  equal(buying.kpis.needsAction, 0);
  // Null, not zero: a zero saving would read as "you saved nothing", which the data cannot support.
  equal(buying.kpis.savedVsRate, null);
  equal(buying.kpis.savedVsRateDelta, null);
  equal(buying.nextMovement, null);
  ok(buying.tasks.some((task) => task.action === "market"));
});

test("charts bucket by the day the order was placed, not by array position", async () => {
  const service = new DashboardService(
    fakePrisma([
      orderFor(ONE_FARMER),
      orderFor(ONE_FARMER, { id: "order-second", createdAt: new Date("2026-08-17T09:00:00.000Z") }),
      orderFor(ONE_FARMER, { id: "order-third", createdAt: new Date("2026-08-17T14:00:00.000Z") }),
    ]),
  );

  const selling = await service.farmerDashboard(asFarmer(ONE_FARMER));

  // Three orders across two Dhaka days: two bars, oldest first, the shared day summed. Bucketing by
  // array position would have put each order on its own bar.
  equal(selling.tradingDays, 2);
  deepEqual(
    selling.daySeries.map((point) => point.date),
    ["2026-08-17", "2026-08-19"],
  );
  equal(selling.daySeries[0].value, 160_000);
  equal(selling.daySeries[1].value, 80_000);
});

test("the day a chart buckets by is the Dhaka day, not the UTC one", async () => {
  // 18:00 UTC is already midnight on the 18th in Dhaka (UTC+6). Bucketing on the stored UTC date
  // would file this order under the 17th and misdate every evening order in the country.
  const service = new DashboardService(
    fakePrisma([orderFor(ONE_FARMER, { id: "order-evening", createdAt: new Date("2026-08-17T18:00:00.000Z") })]),
  );

  const selling = await service.farmerDashboard(asFarmer(ONE_FARMER));

  deepEqual(
    selling.daySeries.map((point) => point.date),
    ["2026-08-18"],
  );
});

test("delivered orders raise a confirmation task and the needs-action count together", async () => {
  const service = new DashboardService(fakePrisma([orderFor(ONE_FARMER, { status: "QUALITY_CHECK" })]));

  const buying = await service.buyerDashboard(asBuyer(BUYER));

  equal(buying.kpis.needsAction, 1);
  // Singular, because one delivery is one delivery.
  ok(buying.tasks.some((task) => task.title === "One delivery is waiting for your confirmation"));
  deepEqual(
    buying.stages.map((stage) => stage.count),
    [0, 0, 1, 0],
  );
});

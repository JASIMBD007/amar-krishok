import { LotStatus, Prisma } from "@prisma/client";
import { equal, ok, rejects } from "node:assert/strict";
import { test } from "node:test";

import { LOT_UNAVAILABLE_MESSAGE, reserveLotQuantity, type LotReservationClient } from "./reserve-lot";

/**
 * Before this existed, placing an order made no write to CropLot at all: quantity never moved and
 * LotStatus.RESERVED and SOLD were only ever display labels. The same lot could be sold without
 * limit, and once escrow arrived each oversold order became a refund to chase.
 */

const decimal = (value: number) => new Prisma.Decimal(value);

type FakeLot = { quantityKg: Prisma.Decimal; status: LotStatus };

/**
 * Stands in for Postgres closely enough to be worth trusting on the one thing that matters: the
 * quantity and status predicates are evaluated at write time, so the fake re-checks them inside
 * updateMany rather than letting the caller check first.
 */
function fakeClient(lots: Record<string, FakeLot>) {
  const calls: string[] = [];

  const client: LotReservationClient = {
    cropLot: {
      async updateMany({ data, where }) {
        calls.push("updateMany");
        const lot = lots[where.id];

        if (!lot || lot.status !== where.status || lot.quantityKg.lessThan(where.quantityKg.gte)) {
          return { count: 0 };
        }

        lot.quantityKg = lot.quantityKg.minus(data.quantityKg.decrement);
        return { count: 1 };
      },
      async findUnique({ where }) {
        const lot = lots[where.id];
        return lot ? { quantityKg: lot.quantityKg } : null;
      },
      async update({ data, where }) {
        calls.push("update");
        lots[where.id].status = data.status;
        return lots[where.id];
      },
    },
  };

  return { calls, client, lots };
}

test("a partial order draws the quantity down and leaves the lot on sale", async () => {
  const { client, lots } = fakeClient({ lot: { quantityKg: decimal(500), status: LotStatus.ACTIVE } });

  await reserveLotQuantity(client, "lot", 120);

  equal(lots.lot.quantityKg.toNumber(), 380);
  equal(lots.lot.status, LotStatus.ACTIVE);
});

test("an order for the whole lot marks it sold", async () => {
  const { client, lots } = fakeClient({ lot: { quantityKg: decimal(500), status: LotStatus.ACTIVE } });

  await reserveLotQuantity(client, "lot", 500);

  equal(lots.lot.quantityKg.toNumber(), 0);
  equal(lots.lot.status, LotStatus.SOLD);
});

test("ordering more than the lot holds is refused and moves nothing", async () => {
  const { client, lots } = fakeClient({ lot: { quantityKg: decimal(100), status: LotStatus.ACTIVE } });

  await rejects(() => reserveLotQuantity(client, "lot", 101), (error: Error) => {
    ok(error.message.includes(LOT_UNAVAILABLE_MESSAGE));
    return true;
  });

  equal(lots.lot.quantityKg.toNumber(), 100);
});

test("two buyers racing for the last of a lot: exactly one wins", async () => {
  const { client, lots } = fakeClient({ lot: { quantityKg: decimal(60), status: LotStatus.ACTIVE } });

  const results = await Promise.allSettled([
    reserveLotQuantity(client, "lot", 60),
    reserveLotQuantity(client, "lot", 60),
  ]);

  equal(results.filter((result) => result.status === "fulfilled").length, 1);
  equal(results.filter((result) => result.status === "rejected").length, 1);
  equal(lots.lot.quantityKg.toNumber(), 0);
  equal(lots.lot.status, LotStatus.SOLD);
});

test("a lot that is not ACTIVE cannot be ordered", async () => {
  for (const status of [LotStatus.SOLD, LotStatus.CANCELLED, LotStatus.RESERVED, LotStatus.DRAFT]) {
    const { client, lots } = fakeClient({ lot: { quantityKg: decimal(500), status } });

    await rejects(() => reserveLotQuantity(client, "lot", 10));
    equal(lots.lot.quantityKg.toNumber(), 500);
  }
});

test("a lot that has gone misses the predicate instead of throwing something opaque", async () => {
  const { client } = fakeClient({});

  await rejects(() => reserveLotQuantity(client, "missing", 10), (error: Error) => {
    ok(error.message.includes(LOT_UNAVAILABLE_MESSAGE));
    return true;
  });
});

test("a sold-out lot is not written again on every later attempt", async () => {
  const { calls, client } = fakeClient({ lot: { quantityKg: decimal(40), status: LotStatus.ACTIVE } });

  await reserveLotQuantity(client, "lot", 40);
  await rejects(() => reserveLotQuantity(client, "lot", 1));

  equal(calls.filter((call) => call === "update").length, 1);
});

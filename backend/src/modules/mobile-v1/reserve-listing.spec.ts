import { ListingStatus } from "@prisma/client";
import { equal, ok, rejects } from "node:assert/strict";
import { test } from "node:test";

import { LISTING_UNAVAILABLE, reserveListingQuantity, type ListingReservationClient } from "./reserve-listing";

/**
 * The platform twin of reserve-lot.spec.ts. Ordering a listing checked the quantity against a row
 * read before the transaction opened and then never decremented it, so one listing could be sold
 * repeatedly, each sale opening its own Escrow row.
 */

type FakeListing = { quantity: number; status: ListingStatus };

/** Re-checks the predicates inside updateMany, which is the behaviour being relied on. */
function fakeClient(listings: Record<string, FakeListing>) {
  const client: ListingReservationClient = {
    listing: {
      async updateMany({ data, where }) {
        const listing = listings[where.id];

        if (!listing || listing.status !== where.status || listing.quantity < where.quantity.gte) {
          return { count: 0 };
        }

        listing.quantity -= data.quantity.decrement;
        return { count: 1 };
      },
      async findUnique({ where }) {
        const listing = listings[where.id];
        return listing ? { quantity: listing.quantity } : null;
      },
      async update({ data, where }) {
        listings[where.id].status = data.status;
        return listings[where.id];
      },
    },
  };

  return { client, listings };
}

test("a partial order draws the mon down and leaves the listing live", async () => {
  const { client, listings } = fakeClient({ listing: { quantity: 40, status: ListingStatus.LIVE } });

  await reserveListingQuantity(client, "listing", 15);

  equal(listings.listing.quantity, 25);
  equal(listings.listing.status, ListingStatus.LIVE);
});

test("an order for the whole listing marks it sold", async () => {
  const { client, listings } = fakeClient({ listing: { quantity: 40, status: ListingStatus.LIVE } });

  await reserveListingQuantity(client, "listing", 40);

  equal(listings.listing.quantity, 0);
  equal(listings.listing.status, ListingStatus.SOLD);
});

test("ordering more mon than the listing holds is refused and moves nothing", async () => {
  const { client, listings } = fakeClient({ listing: { quantity: 10, status: ListingStatus.LIVE } });

  await rejects(() => reserveListingQuantity(client, "listing", 11), (error: Error & { response?: unknown }) => {
    ok(JSON.stringify(error.response ?? error.message).includes(LISTING_UNAVAILABLE.error.code));
    return true;
  });

  equal(listings.listing.quantity, 10);
});

test("two buyers racing for the last of a listing: exactly one wins", async () => {
  const { client, listings } = fakeClient({ listing: { quantity: 12, status: ListingStatus.LIVE } });

  const results = await Promise.allSettled([
    reserveListingQuantity(client, "listing", 12),
    reserveListingQuantity(client, "listing", 12),
  ]);

  equal(results.filter((result) => result.status === "fulfilled").length, 1);
  equal(results.filter((result) => result.status === "rejected").length, 1);
  equal(listings.listing.quantity, 0);
  equal(listings.listing.status, ListingStatus.SOLD);
});

test("a listing that is not LIVE cannot be ordered", async () => {
  for (const status of [ListingStatus.DRAFT, ListingStatus.PAUSED, ListingStatus.SUSPENDED, ListingStatus.SOLD]) {
    const { client, listings } = fakeClient({ listing: { quantity: 40, status } });

    await rejects(() => reserveListingQuantity(client, "listing", 5));
    equal(listings.listing.quantity, 40);
  }
});

test("a listing that has gone is refused rather than throwing something opaque", async () => {
  const { client } = fakeClient({});

  await rejects(() => reserveListingQuantity(client, "missing", 5), (error: Error & { response?: unknown }) => {
    ok(JSON.stringify(error.response ?? error.message).includes(LISTING_UNAVAILABLE.error.code));
    return true;
  });
});

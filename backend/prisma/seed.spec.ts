import { deepEqual, ok } from "node:assert/strict";
import { after, test } from "node:test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

after(async () => {
  await prisma.$disconnect();
});

test("P0 seed reproduces the prototype fixtures with integer-poisha money", async () => {
  const [crops, districts, directoryUsers, supportingUsers, listings, disputes, threads, notifications] = await Promise.all([
    prisma.crop.count({ where: { key: { in: ["potato", "boro-rice", "onion", "tomato", "jute"] } } }),
    prisma.district.count({ where: { name: { in: ["Bogura", "Faridpur", "Naogaon", "Rangpur", "Dhaka", "Chattogram"] } } }),
    prisma.user.count({ where: { id: { in: ["U1", "U2", "U3", "U4", "U5", "U6"] } } }),
    prisma.user.count({ where: { id: { in: ["U7", "U8"] } } }),
    prisma.listing.count(),
    prisma.dispute.count(),
    prisma.thread.count(),
    prisma.notification.count(),
  ]);

  deepEqual(
    { crops, directoryUsers, disputes, districts, listings, notifications, supportingUsers, threads },
    { crops: 5, directoryUsers: 6, disputes: 3, districts: 6, listings: 8, notifications: 9, supportingUsers: 2, threads: 3 },
  );

  const listingMoney = await prisma.listing.findMany({ select: { price: true } });
  const orders = await prisma.order.findMany({ select: { feeAmount: true, total: true, unitPrice: true } });
  const escrows = await prisma.escrow.findMany({ select: { amount: true } });
  const moneyValues = [
    ...listingMoney.map((listing) => listing.price),
    ...orders.flatMap((order) => [order.feeAmount, order.total, order.unitPrice]),
    ...escrows.map((escrow) => escrow.amount),
  ];

  ok(moneyValues.length > 0);
  ok(moneyValues.every(Number.isSafeInteger));
});

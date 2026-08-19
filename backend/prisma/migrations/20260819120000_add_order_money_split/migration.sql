-- The order record has to carry its own three-way split. Before this, only the escrow Payment row
-- knew what the transport and platform slices were, which made it impossible to say what a farmer
-- earns without recomputing a fee rate in the client. LegacyOrder is @@map'd to "Order".

ALTER TABLE "Order" ADD COLUMN "cropTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "transportAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "feeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN "grade" TEXT;

-- Backfill from the escrow payment, which already itemised transport and the platform fee. The
-- oldest payment is the one raised with the order; later rows are refunds or top-ups.
UPDATE "Order" AS o
SET "transportAmount" = p."transportFee",
    "feeAmount" = p."platformFee",
    "paymentMethod" = p."method"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "transportFee", "platformFee", "method"
  FROM "Payment"
  ORDER BY "orderId", "createdAt" ASC
) AS p
WHERE p."orderId" = o."id";

-- The crop subtotal is what is left of the total once the carrier's and the platform's slices are
-- taken out. Falling back to the item sum would disagree with the escrow amount on rounding.
UPDATE "Order"
SET "cropTotal" = GREATEST("totalValue" - "transportAmount" - "feeAmount", 0);

-- Orders that never had a payment row keep a zero split; recover their crop subtotal from the items
-- so the by-crop and district-rate panels still have something honest to read.
UPDATE "Order" AS o
SET "cropTotal" = i."cropTotal"
FROM (
  SELECT "orderId", SUM("quantityKg" * "offeredPricePerKg") AS "cropTotal"
  FROM "OrderItem"
  GROUP BY "orderId"
) AS i
WHERE i."orderId" = o."id" AND o."cropTotal" = 0 AND o."totalValue" = 0;

-- The grade agreed at ordering time, taken from the lot as it stands today.
UPDATE "OrderItem" AS oi
SET "grade" = l."grade"
FROM "CropLot" AS l
WHERE l."id" = oi."cropLotId" AND oi."grade" IS NULL;

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_cropLotId_idx" ON "OrderItem"("cropLotId");

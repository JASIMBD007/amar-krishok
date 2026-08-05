-- Buyer counter-offers on a lot, and the escrow detail the marketplace shows on every order.

CREATE TYPE "OfferStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DECLINED');

CREATE TABLE "LotOffer" (
  "id" TEXT NOT NULL,
  "cropLotId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "pricePerKg" DECIMAL(12,2) NOT NULL,
  "status" "OfferStatus" NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- No SQL default: Prisma sets @updatedAt on every write, matching the initial migration.
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "LotOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LotOffer_cropLotId_status_idx" ON "LotOffer"("cropLotId", "status");
CREATE INDEX "LotOffer_buyerId_status_idx" ON "LotOffer"("buyerId", "status");

ALTER TABLE "LotOffer"
  ADD CONSTRAINT "LotOffer_cropLotId_fkey"
  FOREIGN KEY ("cropLotId") REFERENCES "CropLot"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LotOffer"
  ADD CONSTRAINT "LotOffer_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "disputeOpenedAt" TIMESTAMP(3);

ALTER TABLE "Payment" ADD COLUMN "transportFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "platformFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "method" TEXT;
ALTER TABLE "Payment" ADD COLUMN "releasedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "refundedAt" TIMESTAMP(3);

CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");

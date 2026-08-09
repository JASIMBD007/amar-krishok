ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'CARRIER';

ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "pushToken" TEXT;
ALTER TABLE "PlatformUser" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN CREATE TYPE "CarrierStatus" AS ENUM ('ACTIVE', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TripState" AS ENUM ('OFFERED', 'ACCEPTED', 'EN_ROUTE_PICKUP', 'PICKED_UP', 'EN_ROUTE_DELIVERY', 'DELIVERED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TripStopKind" AS ENUM ('PICKUP', 'DELIVERY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TripBidState" AS ENUM ('OPEN', 'WON', 'LOST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HandoverKind" AS ENUM ('PICKUP', 'DELIVERY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CarrierPayoutState" AS ENUM ('PENDING', 'AVAILABLE', 'PAID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Carrier" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "vehicleReg" TEXT NOT NULL,
  "capacityMon" INTEGER NOT NULL,
  "online" BOOLEAN NOT NULL DEFAULT false,
  "ratingAvg" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "status" "CarrierStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Carrier_userId_key" ON "Carrier"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Carrier_vehicleReg_key" ON "Carrier"("vehicleReg");
CREATE INDEX IF NOT EXISTS "Carrier_online_status_idx" ON "Carrier"("online", "status");

CREATE TABLE IF NOT EXISTS "_CarrierToDistrict" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "_CarrierToDistrict_AB_unique" ON "_CarrierToDistrict"("A", "B");
CREATE INDEX IF NOT EXISTS "_CarrierToDistrict_B_index" ON "_CarrierToDistrict"("B");

CREATE TABLE IF NOT EXISTS "Trip" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "carrierId" TEXT,
  "state" "TripState" NOT NULL DEFAULT 'OFFERED',
  "fee" INTEGER NOT NULL,
  "distanceKm" INTEGER NOT NULL,
  "pickupAt" TIMESTAMP(3) NOT NULL,
  "deliverAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "currentLat" DECIMAL(10,7),
  "currentLng" DECIMAL(10,7),
  "locationAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Trip_orderId_key" ON "Trip"("orderId");
CREATE INDEX IF NOT EXISTS "Trip_carrierId_state_pickupAt_idx" ON "Trip"("carrierId", "state", "pickupAt");
CREATE INDEX IF NOT EXISTS "Trip_state_pickupAt_idx" ON "Trip"("state", "pickupAt");

CREATE TABLE IF NOT EXISTS "TripStop" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "kind" "TripStopKind" NOT NULL,
  "address" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "lat" DECIMAL(10,7) NOT NULL,
  "lng" DECIMAL(10,7) NOT NULL,
  "arrivedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TripStop_tripId_kind_key" ON "TripStop"("tripId", "kind");
CREATE INDEX IF NOT EXISTS "TripStop_districtId_kind_idx" ON "TripStop"("districtId", "kind");

CREATE TABLE IF NOT EXISTS "TripBid" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "carrierId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "state" "TripBidState" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripBid_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TripBid_tripId_carrierId_key" ON "TripBid"("tripId", "carrierId");
CREATE INDEX IF NOT EXISTS "TripBid_tripId_state_amount_idx" ON "TripBid"("tripId", "state", "amount");

CREATE TABLE IF NOT EXISTS "ProofOfHandover" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "kind" "HandoverKind" NOT NULL,
  "weighedMon" DECIMAL(10,2) NOT NULL,
  "photoKeys" TEXT[] NOT NULL,
  "signatureKey" TEXT NOT NULL,
  "confirmedByUserId" TEXT NOT NULL,
  "lat" DECIMAL(10,7),
  "lng" DECIMAL(10,7),
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idempotencyKey" TEXT NOT NULL,
  CONSTRAINT "ProofOfHandover_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProofOfHandover_idempotencyKey_key" ON "ProofOfHandover"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ProofOfHandover_tripId_kind_key" ON "ProofOfHandover"("tripId", "kind");

CREATE TABLE IF NOT EXISTS "CarrierPayout" (
  "id" TEXT NOT NULL,
  "carrierId" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "state" "CarrierPayoutState" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarrierPayout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CarrierPayout_carrierId_tripId_key" ON "CarrierPayout"("carrierId", "tripId");
CREATE INDEX IF NOT EXISTS "CarrierPayout_carrierId_state_idx" ON "CarrierPayout"("carrierId", "state");

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_userId_scope_key_key" ON "IdempotencyRecord"("userId", "scope", "key");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

DO $$ BEGIN ALTER TABLE "Carrier" ADD CONSTRAINT "Carrier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "_CarrierToDistrict" ADD CONSTRAINT "_CarrierToDistrict_A_fkey" FOREIGN KEY ("A") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "_CarrierToDistrict" ADD CONSTRAINT "_CarrierToDistrict_B_fkey" FOREIGN KEY ("B") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Trip" ADD CONSTRAINT "Trip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PlatformOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Trip" ADD CONSTRAINT "Trip_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TripBid" ADD CONSTRAINT "TripBid_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TripBid" ADD CONSTRAINT "TripBid_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProofOfHandover" ADD CONSTRAINT "ProofOfHandover_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProofOfHandover" ADD CONSTRAINT "ProofOfHandover_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CarrierPayout" ADD CONSTRAINT "CarrierPayout_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CarrierPayout" ADD CONSTRAINT "CarrierPayout_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

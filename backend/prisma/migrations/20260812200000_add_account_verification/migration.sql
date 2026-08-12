-- Two-stage account review: accepting a signup request and verifying the documents become
-- separate acts, so an accepted account can sign in without being able to trade yet.
--
-- The Prisma model is LegacyUser but it is @@map'd to "User"; the v2 model owns "PlatformUser".

ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- Everyone already ACTIVE was approved under the old one-step flow, which meant "verified".
-- Without this backfill they would all be demoted to unverified and locked out of posting and
-- ordering the moment this ships.
UPDATE "User"
SET "verifiedAt" = COALESCE("reviewedAt", "updatedAt", "createdAt")
WHERE "status" = 'ACTIVE';

CREATE INDEX "User_status_verifiedAt_idx" ON "User"("status", "verifiedAt");

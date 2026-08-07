-- P0 adds the v2 platform domain alongside the deployed v1 compatibility tables.
-- Every v2 money column is integer poisha; timestamps are stored as PostgreSQL timestamps in UTC.

CREATE TYPE "PlatformRole" AS ENUM ('FARMER', 'BUYER', 'STAFF');
CREATE TYPE "PlatformUserStatus" AS ENUM ('ACTIVE', 'PENDING', 'RESTRICTED');
CREATE TYPE "StaffRoleType" AS ENUM ('SUPER_ADMIN', 'SUPPORT_AGENT');
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'IN_REVIEW', 'VERIFIED', 'REJECTED');
CREATE TYPE "KycDocumentKind" AS ENUM ('NID_FRONT', 'NID_BACK', 'LAND', 'BANK_PROOF');
CREATE TYPE "PayoutMethod" AS ENUM ('BKASH', 'NAGAD', 'BANK');
CREATE TYPE "RateFeedState" AS ENUM ('LIVE', 'LATE', 'MISSING');
CREATE TYPE "ListingGrade" AS ENUM ('A', 'B', 'C');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED', 'SUSPENDED', 'SOLD');
CREATE TYPE "OrderStage" AS ENUM ('PLACED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'PAID', 'REFUNDED');
CREATE TYPE "EscrowState" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'PARTIAL', 'FROZEN');
CREATE TYPE "DisputeState" AS ENUM ('OPEN', 'AWAITING_INFO', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'RESOLVED_PARTIAL');
CREATE TYPE "PayoutState" AS ENUM ('QUEUED', 'SENT', 'FAILED');
CREATE TYPE "ThreadKind" AS ENUM ('DIRECT', 'SUPPORT');
CREATE TYPE "NotificationChannel" AS ENUM ('APP', 'SMS');
CREATE TYPE "NotificationCategory" AS ENUM ('ORDER', 'PAYOUT', 'RATE', 'SYSTEM');

ALTER TYPE "OfferStatus" ADD VALUE 'EXPIRED';

ALTER TABLE "District" ADD COLUMN "nameBn" TEXT, ADD COLUMN "nameEn" TEXT;
UPDATE "District" SET "nameBn" = "name", "nameEn" = "name";
ALTER TABLE "District" ALTER COLUMN "nameBn" SET NOT NULL, ALTER COLUMN "nameEn" SET NOT NULL;

ALTER TABLE "Crop"
  ADD COLUMN "key" TEXT,
  ADD COLUMN "nameBn" TEXT,
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'mon';
UPDATE "Crop"
SET "key" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')) || '-' || substring(md5("id"), 1, 6),
    "nameBn" = "name",
    "nameEn" = "name";
ALTER TABLE "Crop" ALTER COLUMN "key" SET NOT NULL, ALTER COLUMN "nameBn" SET NOT NULL, ALTER COLUMN "nameEn" SET NOT NULL;

CREATE TABLE "PlatformUser" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "PlatformRole" NOT NULL,
  "districtId" TEXT NOT NULL,
  "upazila" TEXT NOT NULL,
  "email" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "status" "PlatformUserStatus" NOT NULL DEFAULT 'PENDING',
  "locale" TEXT NOT NULL DEFAULT 'bn-BD',
  "pinHash" TEXT NOT NULL,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffRole" (
  "userId" TEXT NOT NULL,
  "role" "StaffRoleType" NOT NULL,
  CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Device" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KycProfile" (
  "userId" TEXT NOT NULL,
  "nid" TEXT NOT NULL,
  "khatian" TEXT NOT NULL,
  "status" "KycStatus" NOT NULL DEFAULT 'NONE',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  CONSTRAINT "KycProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "KycDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "KycDocumentKind" NOT NULL,
  "objectKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutAccount" (
  "userId" TEXT NOT NULL,
  "method" "PayoutMethod" NOT NULL,
  "accountNo" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "lockedUntil" TIMESTAMP(3),
  CONSTRAINT "PayoutAccount_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "MarketRate" (
  "id" TEXT NOT NULL,
  "cropId" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "price" INTEGER NOT NULL,
  "prevPrice" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "publishedById" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateFeed" (
  "id" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "lastSuccessAt" TIMESTAMP(3),
  "state" "RateFeedState" NOT NULL,
  CONSTRAINT "RateFeed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Listing" (
  "id" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "cropId" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "grade" "ListingGrade" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "pickupWindow" TEXT NOT NULL,
  "note" TEXT,
  "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
  "suspendedById" TEXT,
  "suspendReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListingPhoto" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "caption" TEXT,
  CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Offer" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "OfferStatus" NOT NULL DEFAULT 'OPEN',
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformOrder" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "feeAmount" INTEGER NOT NULL,
  "stage" "OrderStage" NOT NULL DEFAULT 'PLACED',
  "paymentMethod" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Escrow" (
  "orderId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "state" "EscrowState" NOT NULL DEFAULT 'HELD',
  "heldAt" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "releasedById" TEXT,
  "note" TEXT,
  CONSTRAINT "Escrow_pkey" PRIMARY KEY ("orderId")
);

CREATE TABLE "PlatformPayout" (
  "id" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" "PayoutMethod" NOT NULL,
  "accountNo" TEXT NOT NULL,
  "state" "PayoutState" NOT NULL DEFAULT 'QUEUED',
  "batchId" TEXT NOT NULL,
  "reference" TEXT,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "PlatformPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "state" "DisputeState" NOT NULL,
  "slaDueAt" TIMESTAMP(3) NOT NULL,
  "resolvedById" TEXT,
  "resolutionNote" TEXT,
  "refundAmount" INTEGER,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Thread" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "orderId" TEXT,
  "kind" "ThreadKind" NOT NULL,
  "escalatedAt" TIMESTAMP(3),
  "assignedStaffId" TEXT,
  CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThreadMember" (
  "threadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThreadMember_pkey" PRIMARY KEY ("threadId", "userId")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attachmentKey" TEXT,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "tone" TEXT NOT NULL,
  "entityRef" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPref" (
  "userId" TEXT NOT NULL,
  "smsOrders" BOOLEAN NOT NULL DEFAULT true,
  "smsRates" BOOLEAN NOT NULL DEFAULT true,
  "appAll" BOOLEAN NOT NULL DEFAULT true,
  "weeklyDigest" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "NotificationPref_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "PlatformAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "ip" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformUser_phone_key" ON "PlatformUser"("phone");
CREATE INDEX "PlatformUser_role_status_idx" ON "PlatformUser"("role", "status");
CREATE INDEX "Device_userId_revokedAt_idx" ON "Device"("userId", "revokedAt");
CREATE INDEX "KycDocument_userId_kind_idx" ON "KycDocument"("userId", "kind");
CREATE INDEX "MarketRate_cropId_districtId_date_idx" ON "MarketRate"("cropId", "districtId", "date");
CREATE UNIQUE INDEX "MarketRate_cropId_districtId_date_key" ON "MarketRate"("cropId", "districtId", "date");
CREATE INDEX "RateFeed_districtId_state_idx" ON "RateFeed"("districtId", "state");
CREATE INDEX "Listing_status_cropId_districtId_price_idx" ON "Listing"("status", "cropId", "districtId", "price");
CREATE INDEX "Listing_farmerId_status_idx" ON "Listing"("farmerId", "status");
CREATE UNIQUE INDEX "ListingPhoto_listingId_position_key" ON "ListingPhoto"("listingId", "position");
CREATE INDEX "Offer_listingId_status_idx" ON "Offer"("listingId", "status");
CREATE INDEX "Offer_buyerId_status_idx" ON "Offer"("buyerId", "status");
CREATE UNIQUE INDEX "PlatformOrder_code_key" ON "PlatformOrder"("code");
CREATE INDEX "PlatformOrder_buyerId_createdAt_idx" ON "PlatformOrder"("buyerId", "createdAt");
CREATE INDEX "PlatformOrder_farmerId_createdAt_idx" ON "PlatformOrder"("farmerId", "createdAt");
CREATE INDEX "PlatformPayout_farmerId_state_idx" ON "PlatformPayout"("farmerId", "state");
CREATE UNIQUE INDEX "Dispute_code_key" ON "Dispute"("code");
CREATE INDEX "Dispute_state_slaDueAt_idx" ON "Dispute"("state", "slaDueAt");
CREATE INDEX "Thread_kind_assignedStaffId_idx" ON "Thread"("kind", "assignedStaffId");
CREATE INDEX "ThreadMember_userId_lastReadAt_idx" ON "ThreadMember"("userId", "lastReadAt");
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");
CREATE INDEX "PlatformNotification_userId_readAt_idx" ON "PlatformNotification"("userId", "readAt");
CREATE INDEX "PlatformAuditLog_entityType_entityId_idx" ON "PlatformAuditLog"("entityType", "entityId");
CREATE UNIQUE INDEX "Crop_key_key" ON "Crop"("key");

ALTER TABLE "PlatformUser" ADD CONSTRAINT "PlatformUser_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffRole" ADD CONSTRAINT "StaffRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycProfile" ADD CONSTRAINT "KycProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycProfile" ADD CONSTRAINT "KycProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutAccount" ADD CONSTRAINT "PayoutAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketRate" ADD CONSTRAINT "MarketRate_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketRate" ADD CONSTRAINT "MarketRate_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketRate" ADD CONSTRAINT "MarketRate_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RateFeed" ADD CONSTRAINT "RateFeed_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingPhoto" ADD CONSTRAINT "ListingPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformOrder" ADD CONSTRAINT "PlatformOrder_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformOrder" ADD CONSTRAINT "PlatformOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformOrder" ADD CONSTRAINT "PlatformOrder_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PlatformOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformPayout" ADD CONSTRAINT "PlatformPayout_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PlatformOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PlatformOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThreadMember" ADD CONSTRAINT "ThreadMember_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreadMember" ADD CONSTRAINT "ThreadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformNotification" ADD CONSTRAINT "PlatformNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPref" ADD CONSTRAINT "NotificationPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

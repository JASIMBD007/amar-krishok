-- Persist the five web profile/settings panels on the authenticated legacy account.
-- Identity documents remain private UploadedFile objects; only their owned URLs are stored here.

ALTER TABLE "User"
  ADD COLUMN "payoutProof" TEXT,
  ADD COLUMN "nidNumber" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "paymentMethod" "PayoutMethod",
  ADD COLUMN "paymentAccount" TEXT,
  ADD COLUMN "paymentAccountUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "smsOrderUpdates" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "smsRateAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "appNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "weeklySummary" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "PasswordResetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "PasswordResetRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "phone" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" "PasswordResetStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PasswordResetRequest_status_requestedAt_idx" ON "PasswordResetRequest"("status", "requestedAt");
CREATE INDEX "PasswordResetRequest_userId_status_idx" ON "PasswordResetRequest"("userId", "status");

ALTER TABLE "PasswordResetRequest"
  ADD CONSTRAINT "PasswordResetRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetRequest"
  ADD CONSTRAINT "PasswordResetRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlatformMedia" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformMedia_key_key" ON "PlatformMedia"("key");
CREATE INDEX "PlatformMedia_ownerId_createdAt_idx" ON "PlatformMedia"("ownerId", "createdAt");
ALTER TABLE "PlatformMedia" ADD CONSTRAINT "PlatformMedia_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

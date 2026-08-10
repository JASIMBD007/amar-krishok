-- Photos on a lot, ordered by the farmer with one chosen as the cover.

CREATE TABLE "CropLotPhoto" (
  "id" TEXT NOT NULL,
  "cropLotId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "caption" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isCover" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CropLotPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CropLotPhoto_cropLotId_sortOrder_idx" ON "CropLotPhoto"("cropLotId", "sortOrder");

ALTER TABLE "CropLotPhoto"
  ADD CONSTRAINT "CropLotPhoto_cropLotId_fkey"
  FOREIGN KEY ("cropLotId") REFERENCES "CropLot"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry the existing single image across as each lot's cover photo.
INSERT INTO "CropLotPhoto" ("id", "cropLotId", "url", "sortOrder", "isCover")
SELECT
  'seed-' || "id",
  "id",
  "imageUrl",
  0,
  true
FROM "CropLot"
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';

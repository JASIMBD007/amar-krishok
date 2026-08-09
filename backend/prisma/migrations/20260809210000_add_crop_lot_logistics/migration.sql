-- Listing logistics are seller-declared facts. Keeping them on CropLot makes
-- marketplace filters stable and removes the former browser-side guesswork.
ALTER TABLE "CropLot"
  ADD COLUMN "transportIncluded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pickupWithin24h" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the structured pickup choice previously written into notes by the
-- farmer listing form. English and Bengali records both exist in production.
UPDATE "CropLot"
SET "pickupWithin24h" = true
WHERE "notes" ILIKE '%Within 24 h%'
   OR "notes" LIKE '%২৪ ঘণ্টার মধ্যে%';

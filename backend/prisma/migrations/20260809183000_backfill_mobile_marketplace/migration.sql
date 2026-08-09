-- Move the real, currently published web marketplace into the platform listing model.
-- This is deliberately a data migration, not a prototype seed: every value comes from
-- the existing User/CropLot records and money is converted to integer poisha.

WITH legacy_farmers AS (
  SELECT DISTINCT ON (legacy."id")
    legacy."id",
    legacy."name",
    legacy."passwordHash",
    legacy."organization",
    legacy."address",
    legacy."identity",
    legacy."focus",
    legacy."status",
    legacy."createdAt",
    COALESCE(legacy."districtId", lot."districtId") AS "districtId",
    COALESCE(NULLIF(legacy."upazilla", ''), district."nameBn") AS "upazila",
    CASE
      WHEN regexp_replace(legacy."phone", '[^0-9]', '', 'g') LIKE '880%'
        THEN '+' || regexp_replace(legacy."phone", '[^0-9]', '', 'g')
      WHEN regexp_replace(legacy."phone", '[^0-9]', '', 'g') LIKE '0%'
        THEN '+88' || regexp_replace(legacy."phone", '[^0-9]', '', 'g')
      ELSE '+880' || regexp_replace(legacy."phone", '[^0-9]', '', 'g')
    END AS "platformPhone"
  FROM "User" legacy
  INNER JOIN "CropLot" lot ON lot."farmerId" = legacy."id"
  INNER JOIN "District" district ON district."id" = COALESCE(legacy."districtId", lot."districtId")
  WHERE legacy."role" = 'FARMER'
  ORDER BY legacy."id", lot."createdAt" DESC
)
INSERT INTO "PlatformUser" (
  "id",
  "phone",
  "name",
  "role",
  "districtId",
  "upazila",
  "organization",
  "address",
  "identity",
  "focus",
  "status",
  "locale",
  "pinHash",
  "passwordHash",
  "twoFactorEnabled",
  "tokenVersion",
  "createdAt"
)
SELECT
  'legacy-' || farmer."id",
  farmer."platformPhone",
  farmer."name",
  'FARMER'::"PlatformRole",
  farmer."districtId",
  farmer."upazila",
  farmer."organization",
  farmer."address",
  farmer."identity",
  farmer."focus",
  CASE
    WHEN farmer."status" = 'ACTIVE' THEN 'ACTIVE'::"PlatformUserStatus"
    WHEN farmer."status" = 'REJECTED' THEN 'RESTRICTED'::"PlatformUserStatus"
    ELSE 'PENDING'::"PlatformUserStatus"
  END,
  'bn-BD',
  farmer."passwordHash",
  farmer."passwordHash",
  false,
  0,
  farmer."createdAt"
FROM legacy_farmers farmer
ON CONFLICT ("phone") DO NOTHING;

WITH legacy_lots AS (
  SELECT
    lot.*,
    CASE
      WHEN regexp_replace(legacy."phone", '[^0-9]', '', 'g') LIKE '880%'
        THEN '+' || regexp_replace(legacy."phone", '[^0-9]', '', 'g')
      WHEN regexp_replace(legacy."phone", '[^0-9]', '', 'g') LIKE '0%'
        THEN '+88' || regexp_replace(legacy."phone", '[^0-9]', '', 'g')
      ELSE '+880' || regexp_replace(legacy."phone", '[^0-9]', '', 'g')
    END AS "platformPhone",
    upper(regexp_replace(trim(lot."grade"), '^GRADE[[:space:]]+', '', 'i')) AS "platformGrade"
  FROM "CropLot" lot
  INNER JOIN "User" legacy ON legacy."id" = lot."farmerId"
  WHERE legacy."role" = 'FARMER'
)
INSERT INTO "Listing" (
  "id",
  "farmerId",
  "cropId",
  "districtId",
  "grade",
  "quantity",
  "price",
  "pickupWindow",
  "note",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-' || lot."id",
  farmer."id",
  lot."cropId",
  lot."districtId",
  lot."platformGrade"::"ListingGrade",
  GREATEST(1, round(lot."quantityKg" / 40.0)::integer),
  round(lot."pricePerKg" * 40 * 100)::integer,
  COALESCE(
    NULLIF(substring(lot."notes" from '(?im)^Pickup readiness:[[:space:]]*(.+)$'), ''),
    ''
  ),
  lot."notes",
  CASE lot."status"
    WHEN 'ACTIVE' THEN 'LIVE'::"ListingStatus"
    WHEN 'DRAFT' THEN 'DRAFT'::"ListingStatus"
    WHEN 'SOLD' THEN 'SOLD'::"ListingStatus"
    ELSE 'PAUSED'::"ListingStatus"
  END,
  lot."createdAt",
  lot."updatedAt"
FROM legacy_lots lot
INNER JOIN "PlatformUser" farmer
  ON farmer."phone" = lot."platformPhone"
  AND farmer."role" = 'FARMER'
WHERE lot."platformGrade" IN ('A', 'B', 'C')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ListingPhoto" ("id", "listingId", "objectKey", "position", "caption")
SELECT
  'legacy-' || lot."id" || '-cover',
  'legacy-' || lot."id",
  lot."imageUrl",
  0,
  crop."name" || ' · Grade ' || lot."grade"
FROM "CropLot" lot
INNER JOIN "Crop" crop ON crop."id" = lot."cropId"
INNER JOIN "Listing" listing ON listing."id" = 'legacy-' || lot."id"
WHERE NULLIF(trim(lot."imageUrl"), '') IS NOT NULL
ON CONFLICT ("listingId", "position") DO NOTHING;

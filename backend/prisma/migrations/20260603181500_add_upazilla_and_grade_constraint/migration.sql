ALTER TABLE "User" ADD COLUMN "upazilla" TEXT;

ALTER TABLE "CropLot" ADD COLUMN "upazilla" TEXT;

ALTER TABLE "Order" ADD COLUMN "upazilla" TEXT;

UPDATE "CropLot"
SET "grade" = CASE
  WHEN "grade" IN ('A', 'A-', 'A+') THEN 'A'
  WHEN "grade" IN ('B', 'B-', 'B+') THEN 'B'
  ELSE 'C'
END;

ALTER TABLE "CropLot" ADD CONSTRAINT "CropLot_grade_check" CHECK ("grade" IN ('A', 'B', 'C'));

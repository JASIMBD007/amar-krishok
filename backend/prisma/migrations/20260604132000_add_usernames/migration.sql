ALTER TABLE "User" ADD COLUMN "username" TEXT;

WITH base_usernames AS (
  SELECT
    "id",
    CASE
      WHEN "role" = 'ADMIN' THEN 'admin_amarkrishok'
      ELSE lower(regexp_replace(COALESCE(NULLIF("phone", ''), 'user_' || substr("id", 1, 8)), '[^a-zA-Z0-9]+', '_', 'g'))
    END AS raw_username
  FROM "User"
),
clean_usernames AS (
  SELECT
    "id",
    CASE
      WHEN length(trim(both '_' from raw_username)) >= 3 THEN trim(both '_' from raw_username)
      ELSE 'user_' || substr("id", 1, 8)
    END AS username
  FROM base_usernames
),
ranked_usernames AS (
  SELECT
    "id",
    username,
    row_number() OVER (PARTITION BY username ORDER BY "id") AS username_rank
  FROM clean_usernames
)
UPDATE "User"
SET "username" = CASE
  WHEN ranked_usernames.username_rank = 1 THEN ranked_usernames.username
  ELSE ranked_usernames.username || '_' || ranked_usernames.username_rank
END
FROM ranked_usernames
WHERE "User"."id" = ranked_usernames."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

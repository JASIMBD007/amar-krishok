-- Per-side read marks, so staff clearing their unread badge does not clear the participant's.
-- ChatThread carries no @@map, so the model name is the table name here.

ALTER TABLE "ChatThread" ADD COLUMN "participantReadAt" TIMESTAMP(3);
ALTER TABLE "ChatThread" ADD COLUMN "staffReadAt" TIMESTAMP(3);

-- Existing conversations start fully read on both sides. Leaving them null would show every user
-- a badge for the entire history the first time this ships.
UPDATE "ChatThread" SET "participantReadAt" = "updatedAt", "staffReadAt" = "updatedAt";

-- Store uploaded crop/NID files in the database so Render deploys do not lose them.
ALTER TABLE "UploadedFile" ADD COLUMN "purpose" TEXT;
ALTER TABLE "UploadedFile" ADD COLUMN "content" BYTEA;

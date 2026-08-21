-- Web access tokens had no way to be revoked: a password reset left an already-issued token valid for
-- its full seven days. The platform (mobile) user already carried a tokenVersion for exactly this;
-- this gives the web user the same counter. LegacyUser is @@map'd to "User".
--
-- Default 0 matches the claim a token issued before this migration is treated as carrying, so live
-- sessions keep working until the next password change bumps them.

ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

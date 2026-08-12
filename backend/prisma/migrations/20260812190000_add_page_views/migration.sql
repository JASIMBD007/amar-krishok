-- Visitor counts for the admin console. Additive: no existing table is touched.

CREATE TABLE "PageView" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "countryCode" CHAR(2),
  "visitorHash" TEXT NOT NULL,
  "referrerHost" TEXT,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- The dashboard always filters by date first, then groups by country or path.
CREATE INDEX "PageView_viewedAt_idx" ON "PageView"("viewedAt");
CREATE INDEX "PageView_countryCode_viewedAt_idx" ON "PageView"("countryCode", "viewedAt");
CREATE INDEX "PageView_visitorHash_viewedAt_idx" ON "PageView"("visitorHash", "viewedAt");

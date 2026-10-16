CREATE TABLE IF NOT EXISTS "WebsiteVisit" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "browser" TEXT,
  "deviceType" TEXT,
  "operatingSystem" TEXT,
  "countryCode" TEXT,
  "isBot" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebsiteVisit_createdAt_idx" ON "WebsiteVisit"("createdAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_visitorHash_createdAt_idx" ON "WebsiteVisit"("visitorHash", "createdAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_sessionId_createdAt_idx" ON "WebsiteVisit"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_path_createdAt_idx" ON "WebsiteVisit"("path", "createdAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_ipAddress_createdAt_idx" ON "WebsiteVisit"("ipAddress", "createdAt");

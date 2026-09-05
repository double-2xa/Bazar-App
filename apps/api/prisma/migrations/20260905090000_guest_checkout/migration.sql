ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "guestAccessTokenHash" TEXT;

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "guestEmail" TEXT,
ADD COLUMN IF NOT EXISTS "guestWhatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "guestInvoiceTokenHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_guestAccessTokenHash_key"
ON "User"("guestAccessTokenHash");

CREATE INDEX IF NOT EXISTS "Order_isGuest_createdAt_idx"
ON "Order"("isGuest", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_guestInvoiceTokenHash_key"
ON "Order"("guestInvoiceTokenHash");

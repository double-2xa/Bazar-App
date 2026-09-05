ALTER TABLE "User"
ADD COLUMN "guestAccessTokenHash" TEXT;

ALTER TABLE "Order"
ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "guestEmail" TEXT,
ADD COLUMN "guestWhatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "guestInvoiceTokenHash" TEXT;

CREATE UNIQUE INDEX "User_guestAccessTokenHash_key"
ON "User"("guestAccessTokenHash");

CREATE INDEX "Order_isGuest_createdAt_idx"
ON "Order"("isGuest", "createdAt");

CREATE UNIQUE INDEX "Order_guestInvoiceTokenHash_key"
ON "Order"("guestInvoiceTokenHash");

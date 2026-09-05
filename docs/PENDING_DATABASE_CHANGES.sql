BEGIN;

SET LOCAL search_path TO bazardb, public;

-- Guest checkout and device-secured guest order access.
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

-- Per-unit item preparation decisions.
ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "preparedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "unavailableQuantity" INTEGER NOT NULL DEFAULT 0;

-- Give existing items a deterministic top-to-bottom position.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "orderId" ORDER BY "id") - 1 AS position
  FROM "OrderItem"
)
UPDATE "OrderItem"
SET "position" = ranked.position
FROM ranked
WHERE "OrderItem"."id" = ranked."id";

-- Orders that passed preparation before this feature existed are fully prepared.
-- Pending and cancelled historical orders remain undecided for safety.
UPDATE "OrderItem"
SET "preparedQuantity" = "OrderItem"."quantity"
FROM "Order"
WHERE "OrderItem"."orderId" = "Order"."id"
  AND "Order"."status" NOT IN ('pending', 'cancelled');

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_position_idx"
ON "OrderItem"("orderId", "position");

COMMIT;

-- Verification: each value should be true.
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bazardb' AND table_name = 'User'
      AND column_name = 'guestAccessTokenHash'
  ) AS guest_user_ready,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bazardb' AND table_name = 'Order'
      AND column_name = 'isGuest'
  ) AS guest_order_ready,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bazardb' AND table_name = 'OrderItem'
      AND column_name = 'preparedQuantity'
  ) AS preparation_ready;

ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "preparedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "unavailableQuantity" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "orderId" ORDER BY "id") - 1 AS position
  FROM "OrderItem"
)
UPDATE "OrderItem"
SET "position" = ranked.position
FROM ranked
WHERE "OrderItem"."id" = ranked."id";

-- Orders that already passed preparation before this feature existed are treated
-- as fully prepared. Pending and cancelled historical orders remain undecided.
UPDATE "OrderItem"
SET "preparedQuantity" = "OrderItem"."quantity"
FROM "Order"
WHERE "OrderItem"."orderId" = "Order"."id"
  AND "Order"."status" NOT IN ('pending', 'cancelled');

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_position_idx"
ON "OrderItem"("orderId", "position");

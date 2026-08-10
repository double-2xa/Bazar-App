/*
  Repair production Order schema drift for Nice Price Bazar.

  Run this in pgAdmin Query Tool while connected to:
    database: nicepricebazar-ota-db

  Run it as Bazar/the database owner (not bazar_read).
  This script is repeatable and does not delete or rewrite order data.
*/

BEGIN;

DO $repair$
BEGIN
  IF current_database() <> 'nicepricebazar-ota-db' THEN
    RAISE EXCEPTION
      'Wrong database: connected to %, expected nicepricebazar-ota-db',
      current_database();
  END IF;

  IF to_regclass('bazardb."Order"') IS NULL THEN
    RAISE EXCEPTION 'Required table bazardb."Order" does not exist';
  END IF;
END
$repair$;

ALTER TABLE bazardb."Order"
  ADD COLUMN IF NOT EXISTS "whishExternalId" TEXT,
  ADD COLUMN IF NOT EXISTS "whishTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyHash" TEXT;

-- Order queries include the related delivery address. The current API uses
-- this nullable timestamp to preserve historical addresses after deletion.
ALTER TABLE bazardb."Address"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

DO $repair$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM bazardb."Order"
    WHERE "whishExternalId" IS NOT NULL
    GROUP BY "whishExternalId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create Whish unique index: duplicate non-null whishExternalId values exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM bazardb."Order"
    WHERE "idempotencyKey" IS NOT NULL
    GROUP BY "userId", "idempotencyKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create checkout unique index: duplicate userId/idempotencyKey values exist';
  END IF;
END
$repair$;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_whishExternalId_key"
  ON bazardb."Order" ("whishExternalId");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_userId_idempotencyKey_key"
  ON bazardb."Order" ("userId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"
  ON bazardb."Order" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx"
  ON bazardb."Order" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_deliveryAgentId_status_createdAt_idx"
  ON bazardb."Order" ("deliveryAgentId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_paymentMethod_paymentStatus_status_idx"
  ON bazardb."Order" ("paymentMethod", "paymentStatus", "status");

CREATE INDEX IF NOT EXISTS "Address_userId_deletedAt_idx"
  ON bazardb."Address" ("userId", "deletedAt");

COMMIT;

-- Verification: every row should show column_present = true.
SELECT
  expected.table_name,
  expected.column_name,
  (actual.column_name IS NOT NULL) AS column_present
FROM (
  VALUES
    ('Order', 'whishExternalId'),
    ('Order', 'whishTransactionId'),
    ('Order', 'idempotencyKey'),
    ('Order', 'idempotencyHash'),
    ('Address', 'deletedAt')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns AS actual
  ON actual.table_schema = 'bazardb'
 AND actual.table_name = expected.table_name
 AND actual.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

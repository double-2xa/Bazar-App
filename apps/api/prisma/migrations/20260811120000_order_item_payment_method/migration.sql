-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'cash_on_delivery';

-- CreateIndex
CREATE INDEX "OrderItem_paymentMethod_idx" ON "OrderItem"("paymentMethod");

-- Backfill from parent orders
UPDATE "OrderItem" AS oi
SET "paymentMethod" = o."paymentMethod"
FROM "Order" AS o
WHERE oi."orderId" = o."id";

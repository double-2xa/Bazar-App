-- AlterTable
ALTER TABLE "Order" ADD COLUMN "whishExternalId" TEXT;
ALTER TABLE "Order" ADD COLUMN "whishTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_whishExternalId_key" ON "Order"("whishExternalId");

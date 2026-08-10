-- Soft-delete addresses so Remove works while order history keeps the FK
ALTER TABLE "Address" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Address_userId_deletedAt_idx" ON "Address"("userId", "deletedAt");

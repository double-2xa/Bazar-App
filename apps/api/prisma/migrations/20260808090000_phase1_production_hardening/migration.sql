-- Checkout idempotency. PostgreSQL permits multiple NULL values in this unique index.
ALTER TABLE "Order"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "idempotencyHash" TEXT;

CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key"
ON "Order"("userId", "idempotencyKey");

-- High-value indexes for the application's actual filters, joins, and sort order.
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "CompanyProfile_status_createdAt_idx" ON "CompanyProfile"("status", "createdAt");
CREATE INDEX "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");
CREATE INDEX "Product_stockQuantity_idx" ON "Product"("stockQuantity");
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");
CREATE INDEX "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_deliveryAgentId_status_createdAt_idx" ON "Order"("deliveryAgentId", "status", "createdAt");
CREATE INDEX "Order_paymentMethod_paymentStatus_status_idx" ON "Order"("paymentMethod", "paymentStatus", "status");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "OrderStatusHistory_changedByUserId_idx" ON "OrderStatusHistory"("changedByUserId");
CREATE INDEX "DeliveryProof_deliveryAgentId_idx" ON "DeliveryProof"("deliveryAgentId");

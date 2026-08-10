-- Nice Price Bazar - PostgreSQL 18 bootstrap for an EMPTY database
-- Generated from apps/api/prisma/schema.prisma.
-- Run once in pgAdmin Query Tool while connected to the intended EMPTY database.
-- This script is transactional: any error rolls back all schema changes.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';

-- Keep all application objects isolated from PostgreSQL's public schema.
CREATE SCHEMA IF NOT EXISTS bazardb AUTHORIZATION CURRENT_USER;
SET LOCAL search_path = bazardb, public;

DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 180000 THEN
    RAISE EXCEPTION 'PostgreSQL 18 or newer is required; connected server is %', version();
  END IF;
  IF to_regclass('bazardb."User"') IS NOT NULL OR to_regclass('bazardb."Product"') IS NOT NULL THEN
    RAISE EXCEPTION 'The bazardb schema is not empty. Stop and verify the selected database before running this bootstrap.';
  END IF;
END
$$;

-- On a fresh database this installs pg_trgm in bazardb. If the hosting
-- provider already installed it in public, the search_path above still finds it.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA bazardb;
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('normal_user', 'company', 'admin', 'delivery_agent');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('normal', 'company');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash_on_delivery', 'card');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('percentage', 'fixed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'local',
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'normal_user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushReceipt" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "checkAfter" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "companyPhone" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "normalPrice" DECIMAL(10,2) NOT NULL,
    "companyPrice" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL,
    "brand" TEXT,
    "imageUrl" TEXT,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Lebanon',
    "governorate" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "settlementId" TEXT,
    "street" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "apartment" TEXT,
    "postalCode" TEXT,
    "locationEncrypted" TEXT,
    "locationHash" TEXT,
    "locationGeohash" TEXT,
    "locationAccuracyM" DOUBLE PRECISION,
    "locationCapturedAt" TIMESTAMP(3),
    "hasExactLocation" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "selectedPriceType" "PriceType" NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "deliveryAgentId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'cash_on_delivery',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "customerNote" TEXT,
    "idempotencyKey" TEXT,
    "idempotencyHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "selectedPriceType" "PriceType" NOT NULL DEFAULT 'normal',
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryAgentId" TEXT NOT NULL,
    "deliveredToName" TEXT,
    "deliveryNote" TEXT,
    "agentSignatureDataUrl" TEXT,
    "clientSignatureDataUrl" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "DeliveryProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_isActive_idx" ON "PushToken"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PushReceipt_ticketId_key" ON "PushReceipt"("ticketId");

-- CreateIndex
CREATE INDEX "PushReceipt_checkAfter_idx" ON "PushReceipt"("checkAfter");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

-- CreateIndex
CREATE INDEX "CompanyProfile_status_createdAt_idx" ON "CompanyProfile"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Product_stockQuantity_idx" ON "Product"("stockQuantity");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "Address_settlementId_idx" ON "Address"("settlementId");

-- CreateIndex
CREATE INDEX "Address_governorate_district_city_idx" ON "Address"("governorate", "district", "city");

-- CreateIndex
CREATE INDEX "Address_locationGeohash_idx" ON "Address"("locationGeohash");

-- CreateIndex
CREATE INDEX "Address_hasExactLocation_idx" ON "Address"("hasExactLocation");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_selectedPriceType_key" ON "CartItem"("cartId", "productId", "selectedPriceType");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_deliveryAgentId_status_createdAt_idx" ON "Order"("deliveryAgentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentMethod_paymentStatus_status_idx" ON "Order"("paymentMethod", "paymentStatus", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_changedByUserId_idx" ON "OrderStatusHistory"("changedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryProof_orderId_key" ON "DeliveryProof"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryProof_deliveryAgentId_idx" ON "DeliveryProof"("deliveryAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_productId_orderId_key" ON "Review"("userId", "productId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryAgentId_fkey" FOREIGN KEY ("deliveryAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProof" ADD CONSTRAINT "DeliveryProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProof" ADD CONSTRAINT "DeliveryProof_deliveryAgentId_fkey" FOREIGN KEY ("deliveryAgentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigram GIN indexes for the application's case-insensitive product search.
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_description_trgm_idx" ON "Product" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "Product_brand_trgm_idx" ON "Product" USING GIN ("brand" gin_trgm_ops);

-- Record the existing Prisma migrations as applied. This prevents a later
-- `prisma migrate deploy` from attempting to create this bootstrap schema again.
CREATE TABLE "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES('f758aaac-1a5b-4cc4-91b7-dc4896afd354', 'dcab44504535ef8144caf5f192b6661cdc5eae08e1f3452cbe6d2df49acf53f3', CURRENT_TIMESTAMP, '20240701000000_init', NULL, NULL, CURRENT_TIMESTAMP, 1),
('d55ff1cd-29c7-4b4d-8fe1-943800202868', '89c1969dd2756deeb9aa408b260bb86423f76db75185ae02b376afc5912c26de', CURRENT_TIMESTAMP, '20240702000000_add_accepted_status', NULL, NULL, CURRENT_TIMESTAMP, 1),
('7a694252-82c2-4fe7-a7a8-8a31e9fe0bc6', '9f1ae474721ba56900f04ea7462b3002e55be3b7193d7064a06a3289a339a8a3', CURRENT_TIMESTAMP, '20260805000000_add_product_sold_count', NULL, NULL, CURRENT_TIMESTAMP, 1),
('76b7befb-5bf8-4f8a-85d2-1d199ee229cd', 'ec0bbdc2f3e4117389b8a4ff6fa041fa460e8a56e086ab00b161060205df281d', CURRENT_TIMESTAMP, '20260805010000_add_notifications', NULL, NULL, CURRENT_TIMESTAMP, 1),
('993d5d7a-5b80-4e08-bf00-3237c61686f7', '56c7c36f1332d072ae5a1ec1bdb907f4cae8f91adcc3308860acabd80c322b30', CURRENT_TIMESTAMP, '20260805020000_delivery_signatures', NULL, NULL, CURRENT_TIMESTAMP, 1),
('fffa1284-6b86-4c87-ad01-d8800a4ede61', 'ebe7ca700c3e4e973ba999e82123f515995833d4713c6b650e2a6e301c21dd22', CURRENT_TIMESTAMP, '20260805220000_lebanon_secure_addresses', NULL, NULL, CURRENT_TIMESTAMP, 1),
('b6a10c9e-7790-45ba-93b1-d2e313af40a0', 'd4c93aeb39cb954195a28c34e3789377fe02ff46b3fa161cb851a5c5657ef191', CURRENT_TIMESTAMP, '20260806000000_google_auth', NULL, NULL, CURRENT_TIMESTAMP, 1),
('78b403e5-4f8f-4b94-86c2-01da2a57518d', '88b56f7f7734b68d926c924477fc08d71e71550cd14b8250d8fa1e3f8f653006', CURRENT_TIMESTAMP, '20260808090000_phase1_production_hardening', NULL, NULL, CURRENT_TIMESTAMP, 1),
('2e8a5138-ccdf-4b1e-99d5-a3d4ff385152', 'd8e888bf19001a904022f2c0ab42352f58c9f1fe4eee183fdb935d26e79b0be0', CURRENT_TIMESTAMP, '20260808160000_phase2_search_indexes', NULL, NULL, CURRENT_TIMESTAMP, 1),
('bee10415-ab42-417f-ab54-729a2c99d7f0', '7f83cbfd9476eeecc9d1c345f6129a0a13000dc76a28110f672797289f2a4240', CURRENT_TIMESTAMP, '20260808170000_native_push_tokens', NULL, NULL, CURRENT_TIMESTAMP, 1);

COMMIT;

-- Verification results should show 20 application tables, 7 enum types,
-- pg_trgm installed, and every migration marked as successfully applied.
SELECT COUNT(*) AS application_table_count
FROM information_schema.tables
WHERE table_schema = 'bazardb'
  AND table_name NOT IN ('_prisma_migrations');

SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';

SELECT migration_name, finished_at, rolled_back_at
FROM bazardb."_prisma_migrations"
ORDER BY migration_name;

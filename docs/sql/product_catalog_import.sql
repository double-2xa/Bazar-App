-- Run this once in the Nice Price Bazar database query tool before deploying the new API.
-- It is deliberately compatible with the Prisma migration that ships with the application.
BEGIN;
SET LOCAL search_path TO bazardb, public;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '10min';

-- Product catalog staging, bilingual names, optional catalog fields and two-level categories.
-- This migration is intentionally safe to run after the matching manual SQL script.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE "ProductImportStatus" AS ENUM ('uploaded', 'analyzing', 'ready', 'importing', 'completed', 'completed_with_errors', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductImportRowStatus" AS ENUM ('ready', 'warning', 'invalid', 'skipped', 'imported', 'published', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductImportAction" AS ENUM ('create', 'skip', 'overwrite');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Subcategory" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nameAr" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT;
ALTER TABLE "Product" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "companyPrice" DROP NOT NULL;
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ProductImportBatch" (
  "id" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedFilePath" TEXT NOT NULL,
  "fileHash" TEXT NOT NULL,
  "sheetName" TEXT,
  "firstDataRow" INTEGER,
  "lastDataRow" INTEGER,
  "selectedFromRow" INTEGER,
  "selectedToRow" INTEGER,
  "status" "ProductImportStatus" NOT NULL DEFAULT 'uploaded',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "selectedRows" INTEGER NOT NULL DEFAULT 0,
  "readyRows" INTEGER NOT NULL DEFAULT 0,
  "warningRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "duplicateRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "publishedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "analyzedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ProductImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductImportRow" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "excelRow" INTEGER NOT NULL,
  "barcode" TEXT,
  "nameAr" TEXT,
  "nameEn" TEXT,
  "currency" TEXT,
  "normalPrice" DECIMAL(10,2),
  "companyPrice" DECIMAL(10,2),
  "categoryName" TEXT,
  "subcategoryName" TEXT,
  "categoryId" TEXT,
  "subcategoryId" TEXT,
  "sourceImage" TEXT,
  "storedImageUrl" TEXT,
  "stockQuantity" INTEGER,
  "action" "ProductImportAction" NOT NULL DEFAULT 'create',
  "status" "ProductImportRowStatus" NOT NULL DEFAULT 'ready',
  "issues" JSONB,
  "existingProductId" TEXT,
  "publishedProductId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductImportRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subcategory_categoryId_slug_key" ON "Subcategory"("categoryId", "slug");
CREATE INDEX IF NOT EXISTS "Subcategory_categoryId_isActive_idx" ON "Subcategory"("categoryId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX IF NOT EXISTS "Product_subcategoryId_isActive_idx" ON "Product"("subcategoryId", "isActive");
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_nameAr_trgm_idx" ON "Product" USING GIN ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_nameEn_trgm_idx" ON "Product" USING GIN ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProductImportBatch_createdById_createdAt_idx" ON "ProductImportBatch"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductImportBatch_status_createdAt_idx" ON "ProductImportBatch"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductImportBatch_fileHash_idx" ON "ProductImportBatch"("fileHash");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductImportRow_batchId_excelRow_key" ON "ProductImportRow"("batchId", "excelRow");
CREATE INDEX IF NOT EXISTS "ProductImportRow_batchId_status_excelRow_idx" ON "ProductImportRow"("batchId", "status", "excelRow");
CREATE INDEX IF NOT EXISTS "ProductImportRow_batchId_action_idx" ON "ProductImportRow"("batchId", "action");
CREATE INDEX IF NOT EXISTS "ProductImportRow_barcode_idx" ON "ProductImportRow"("barcode");
CREATE INDEX IF NOT EXISTS "ProductImportRow_existingProductId_idx" ON "ProductImportRow"("existingProductId");
CREATE INDEX IF NOT EXISTS "ProductImportRow_publishedProductId_idx" ON "ProductImportRow"("publishedProductId");

DO $$ BEGIN
  ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductImportBatch" ADD CONSTRAINT "ProductImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductImportRow" ADD CONSTRAINT "ProductImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bazar_muteren') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Subcategory", "ProductImportBatch", "ProductImportRow" TO bazar_muteren;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bazar_read') THEN
    GRANT SELECT ON TABLE "Subcategory", "ProductImportBatch", "ProductImportRow" TO bazar_read;
  END IF;
END $$;

COMMIT;

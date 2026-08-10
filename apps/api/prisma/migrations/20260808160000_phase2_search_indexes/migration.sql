-- Accelerates case-insensitive contains searches used by the product catalog.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Product_name_trgm_idx"
  ON "Product" USING GIN ("name" gin_trgm_ops);

CREATE INDEX "Product_description_trgm_idx"
  ON "Product" USING GIN ("description" gin_trgm_ops);

CREATE INDEX "Product_brand_trgm_idx"
  ON "Product" USING GIN ("brand" gin_trgm_ops);

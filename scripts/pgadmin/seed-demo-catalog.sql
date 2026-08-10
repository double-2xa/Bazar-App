/*
  Nice Price Bazar - demo catalog seed

  Creates or updates:
    - 3 active categories
    - 10 active products
    - 10 product gallery images
    - 2 active test coupons

  Safe to run more than once. Existing rows with the same category/product slug,
  image ID, or coupon code are updated. No users, carts, orders, or reviews are changed.

  Run this in pgAdmin Query Tool while connected to:
    Database: nicepricebazar-ota-db
*/

BEGIN;

SET LOCAL search_path TO bazardb, public;

DO $$
BEGIN
  IF to_regclass('bazardb."Category"') IS NULL
     OR to_regclass('bazardb."Product"') IS NULL
     OR to_regclass('bazardb."ProductImage"') IS NULL
     OR to_regclass('bazardb."Coupon"') IS NULL THEN
    RAISE EXCEPTION 'Required Nice Price Bazar tables were not found in schema bazardb. Check the selected database and schema.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

INSERT INTO "Category" (
  "id", "name", "slug", "description", "imageUrl", "isActive", "createdAt", "updatedAt"
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'Home & Kitchen',
    'home-kitchen',
    'Practical products for cooking, dining, cleaning, and everyday home life.',
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
    TRUE, NOW(), NOW()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Electronics',
    'electronics',
    'Useful personal electronics, accessories, and connected devices.',
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80',
    TRUE, NOW(), NOW()
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Outdoor & Lifestyle',
    'outdoor-lifestyle',
    'Equipment and accessories for travel, fitness, camping, and daily adventures.',
    'https://images.unsplash.com/photo-1475483768296-6163e08872a1?auto=format&fit=crop&w=1200&q=80',
    TRUE, NOW(), NOW()
  )
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "imageUrl" = EXCLUDED."imageUrl",
  "isActive" = TRUE,
  "updatedAt" = NOW();

-- ---------------------------------------------------------------------------
-- Products
-- Company prices are deliberately lower so company-account pricing can be tested.
-- Stock includes healthy, low-stock, and sold-out examples for the dashboard.
-- ---------------------------------------------------------------------------

INSERT INTO "Product" (
  "id", "categoryId", "name", "slug", "description",
  "normalPrice", "companyPrice", "stockQuantity", "sku", "brand", "imageUrl",
  "ratingAverage", "ratingCount", "soldCount", "isFeatured", "isActive",
  "createdAt", "updatedAt"
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    (SELECT "id" FROM "Category" WHERE "slug" = 'home-kitchen'),
    'Stainless Steel Cookware Set',
    'stainless-steel-cookware-set',
    'A durable seven-piece stainless steel cookware set suitable for everyday family meals.',
    249.99, 219.99, 18, 'NPB-HK-001', 'ChefCraft',
    'https://images.pexels.com/photos/5782042/pexels-photo-5782042.jpeg?auto=compress&cs=tinysrgb&w=1200',
    4.7, 38, 74, TRUE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    (SELECT "id" FROM "Category" WHERE "slug" = 'home-kitchen'),
    'Digital Air Fryer 5L',
    'digital-air-fryer-5l',
    'Five-liter digital air fryer with adjustable temperature and simple preset cooking modes.',
    129.99, 112.50, 9, 'NPB-HK-002', 'HomeEase',
    'https://images.pexels.com/photos/35285814/pexels-photo-35285814.jpeg?auto=compress&cs=tinysrgb&w=1200',
    4.5, 24, 51, TRUE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    (SELECT "id" FROM "Category" WHERE "slug" = 'home-kitchen'),
    'Insulated Travel Mug',
    'insulated-travel-mug',
    'Leak-resistant stainless steel travel mug that keeps drinks hot or cold for hours.',
    24.99, 19.99, 3, 'NPB-HK-003', 'DailySip',
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=80',
    4.3, 17, 33, FALSE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    (SELECT "id" FROM "Category" WHERE "slug" = 'home-kitchen'),
    'Bamboo Cutting Board',
    'bamboo-cutting-board',
    'Large bamboo cutting board with a juice groove and easy-grip side handles.',
    32.00, 26.50, 0, 'NPB-HK-004', 'GreenHome',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    4.1, 9, 19, FALSE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    (SELECT "id" FROM "Category" WHERE "slug" = 'electronics'),
    'Wireless Noise-Cancelling Headphones',
    'wireless-noise-cancelling-headphones',
    'Comfortable over-ear wireless headphones with active noise cancellation and long battery life.',
    179.99, 154.99, 14, 'NPB-EL-001', 'NovaSound',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    4.8, 61, 108, TRUE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    (SELECT "id" FROM "Category" WHERE "slug" = 'electronics'),
    'Smart Fitness Watch',
    'smart-fitness-watch',
    'Water-resistant fitness watch with heart-rate tracking, activity goals, and phone notifications.',
    89.99, 76.00, 21, 'NPB-EL-002', 'PulseGo',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
    4.4, 42, 87, TRUE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    (SELECT "id" FROM "Category" WHERE "slug" = 'electronics'),
    'Portable Bluetooth Speaker',
    'portable-bluetooth-speaker',
    'Compact rechargeable speaker with clear sound, strong bass, and splash resistance.',
    59.99, 49.99, 4, 'NPB-EL-003', 'WaveBox',
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1200&q=80',
    4.6, 29, 63, FALSE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    (SELECT "id" FROM "Category" WHERE "slug" = 'outdoor-lifestyle'),
    'Camping Tent 4-Person',
    'camping-tent-4-person',
    'Weather-resistant four-person tent with ventilation panels and a compact carry bag.',
    179.99, 155.00, 7, 'NPB-OL-001', 'TrailPeak',
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
    4.7, 35, 69, TRUE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    (SELECT "id" FROM "Category" WHERE "slug" = 'outdoor-lifestyle'),
    'Hiking Backpack 35L',
    'hiking-backpack-35l',
    'Lightweight 35-liter hiking backpack with padded straps and multiple organized compartments.',
    74.99, 62.50, 11, 'NPB-OL-002', 'TrailPeak',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80',
    4.5, 21, 46, FALSE, TRUE, NOW(), NOW()
  ),
  (
    '20000000-0000-4000-8000-000000000010',
    (SELECT "id" FROM "Category" WHERE "slug" = 'outdoor-lifestyle'),
    'Insulated Water Bottle 750ml',
    'insulated-water-bottle-750ml',
    'Reusable double-wall bottle designed to keep water cold throughout the day.',
    29.99, 23.99, 2, 'NPB-OL-003', 'HydraLife',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=80',
    4.2, 14, 28, FALSE, TRUE, NOW(), NOW()
  )
ON CONFLICT ("slug") DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "normalPrice" = EXCLUDED."normalPrice",
  "companyPrice" = EXCLUDED."companyPrice",
  "stockQuantity" = EXCLUDED."stockQuantity",
  "brand" = EXCLUDED."brand",
  "imageUrl" = EXCLUDED."imageUrl",
  "ratingAverage" = EXCLUDED."ratingAverage",
  "ratingCount" = EXCLUDED."ratingCount",
  "soldCount" = EXCLUDED."soldCount",
  "isFeatured" = EXCLUDED."isFeatured",
  "isActive" = TRUE,
  "updatedAt" = NOW();

-- Keep the fixed demo SKUs synchronized when a product slug already existed.
UPDATE "Product" SET "sku" = CASE "slug"
  WHEN 'stainless-steel-cookware-set' THEN 'NPB-HK-001'
  WHEN 'digital-air-fryer-5l' THEN 'NPB-HK-002'
  WHEN 'insulated-travel-mug' THEN 'NPB-HK-003'
  WHEN 'bamboo-cutting-board' THEN 'NPB-HK-004'
  WHEN 'wireless-noise-cancelling-headphones' THEN 'NPB-EL-001'
  WHEN 'smart-fitness-watch' THEN 'NPB-EL-002'
  WHEN 'portable-bluetooth-speaker' THEN 'NPB-EL-003'
  WHEN 'camping-tent-4-person' THEN 'NPB-OL-001'
  WHEN 'hiking-backpack-35l' THEN 'NPB-OL-002'
  WHEN 'insulated-water-bottle-750ml' THEN 'NPB-OL-003'
  ELSE "sku"
END
WHERE "slug" IN (
  'stainless-steel-cookware-set', 'digital-air-fryer-5l',
  'insulated-travel-mug', 'bamboo-cutting-board',
  'wireless-noise-cancelling-headphones', 'smart-fitness-watch',
  'portable-bluetooth-speaker', 'camping-tent-4-person',
  'hiking-backpack-35l', 'insulated-water-bottle-750ml'
);

-- ---------------------------------------------------------------------------
-- Product gallery images
-- ---------------------------------------------------------------------------

INSERT INTO "ProductImage" ("id", "productId", "imageUrl", "sortOrder")
SELECT
  '30000000-0000-4000-8000-' || LPAD(ROW_NUMBER() OVER (ORDER BY p."slug")::text, 12, '0'),
  p."id",
  p."imageUrl",
  0
FROM "Product" p
WHERE p."slug" IN (
  'stainless-steel-cookware-set', 'digital-air-fryer-5l',
  'insulated-travel-mug', 'bamboo-cutting-board',
  'wireless-noise-cancelling-headphones', 'smart-fitness-watch',
  'portable-bluetooth-speaker', 'camping-tent-4-person',
  'hiking-backpack-35l', 'insulated-water-bottle-750ml'
)
ON CONFLICT ("id") DO UPDATE SET
  "productId" = EXCLUDED."productId",
  "imageUrl" = EXCLUDED."imageUrl",
  "sortOrder" = EXCLUDED."sortOrder";

-- ---------------------------------------------------------------------------
-- Test coupons
-- TEST10: 10% discount on orders of $50 or more
-- SAVE5:  $5 discount on orders of $30 or more
-- ---------------------------------------------------------------------------

INSERT INTO "Coupon" (
  "id", "code", "type", "value", "minOrderAmount", "isActive",
  "startsAt", "expiresAt", "createdAt", "updatedAt"
)
VALUES
  (
    '40000000-0000-4000-8000-000000000001',
    'TEST10', 'percentage', 10.00, 50.00, TRUE,
    NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days', NOW(), NOW()
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'SAVE5', 'fixed', 5.00, 30.00, TRUE,
    NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days', NOW(), NOW()
  )
ON CONFLICT ("code") DO UPDATE SET
  "type" = EXCLUDED."type",
  "value" = EXCLUDED."value",
  "minOrderAmount" = EXCLUDED."minOrderAmount",
  "isActive" = TRUE,
  "startsAt" = EXCLUDED."startsAt",
  "expiresAt" = EXCLUDED."expiresAt",
  "updatedAt" = NOW();

-- Abort instead of committing a partial or unexpected seed.
DO $$
DECLARE
  demo_category_count integer;
  demo_product_count integer;
  demo_coupon_count integer;
BEGIN
  SELECT COUNT(*) INTO demo_category_count
  FROM "Category"
  WHERE "slug" IN ('home-kitchen', 'electronics', 'outdoor-lifestyle');

  SELECT COUNT(*) INTO demo_product_count
  FROM "Product"
  WHERE "slug" IN (
    'stainless-steel-cookware-set', 'digital-air-fryer-5l',
    'insulated-travel-mug', 'bamboo-cutting-board',
    'wireless-noise-cancelling-headphones', 'smart-fitness-watch',
    'portable-bluetooth-speaker', 'camping-tent-4-person',
    'hiking-backpack-35l', 'insulated-water-bottle-750ml'
  );

  SELECT COUNT(*) INTO demo_coupon_count
  FROM "Coupon"
  WHERE "code" IN ('TEST10', 'SAVE5');

  IF demo_category_count <> 3 OR demo_product_count <> 10 OR demo_coupon_count <> 2 THEN
    RAISE EXCEPTION
      'Seed verification failed: expected 3 categories, 10 products and 2 coupons; got %, % and %.',
      demo_category_count, demo_product_count, demo_coupon_count;
  END IF;
END $$;

COMMIT;

-- Verification result shown in pgAdmin Data Output.
SELECT 'Categories' AS "dataType", COUNT(*) AS "demoRows"
FROM bazardb."Category"
WHERE "slug" IN ('home-kitchen', 'electronics', 'outdoor-lifestyle')
UNION ALL
SELECT 'Products', COUNT(*)
FROM bazardb."Product"
WHERE "sku" LIKE 'NPB-%'
UNION ALL
SELECT 'Coupons', COUNT(*)
FROM bazardb."Coupon"
WHERE "code" IN ('TEST10', 'SAVE5');

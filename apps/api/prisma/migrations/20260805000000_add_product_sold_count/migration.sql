-- Track units sold for top-sellers ranking (denormalized from OrderItem)
ALTER TABLE "Product" ADD COLUMN "soldCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill from non-cancelled orders
UPDATE "Product" AS p
SET "soldCount" = COALESCE(s.total, 0)
FROM (
  SELECT oi."productId", SUM(oi.quantity)::integer AS total
  FROM "OrderItem" AS oi
  INNER JOIN "Order" AS o ON o.id = oi."orderId"
  WHERE o.status <> 'cancelled'
  GROUP BY oi."productId"
) AS s
WHERE p.id = s."productId";

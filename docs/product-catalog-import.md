# Product catalog import

## Deployment order

1. Back up the production database.
2. Run `docs/sql/product_catalog_import.sql` once in the Nice Price Bazar database query tool.
3. Deploy the API so the new import endpoints and background worker are available.
4. Deploy the admin portal.
5. Deploy the mobile/web storefront because product pricing is now allowed to have no wholesale price and product lists use paginated loading.

The Prisma migration is idempotent with the manual SQL. A later `prisma migrate deploy` can safely record the migration after the SQL was applied manually.

## First test

Use `item_excel_updated.xlsx` and select Excel rows 2 through 31. Row 1 is the header. The expected analysis is 30 valid product rows, 21 image URLs and 9 missing images before comparing barcodes with the production database.

The **Import Batch** action creates staged import rows only. It does not create live products. Use **Imported products** to review and publish selected rows.

## Images

Remote images are downloaded with a timeout, size limit, file-signature validation, redirect limit and private-network protection. Stored images use the existing persistent `uploads` volume. Keep that volume mounted across API deployments.

Set these API environment variables:

```env
PUBLIC_API_URL=https://your-api-domain.example/api
IMPORT_IMAGE_TIMEOUT_MS=12000
IMPORT_IMAGE_CONCURRENCY=5
```

`PUBLIC_API_URL` must point to the public API URL so imported image paths resolve correctly in the admin portal and storefront.

## Supported columns

- `Item`
- `Product Name AR`
- `Product Name EN`
- `Curr. Name`
- `Price A`
- `Wholesale Price`
- `Categories`
- `Sub Categories`
- `Image`
- `Stock` (optional; new products default to 50 when empty)

Header matching ignores spaces, punctuation and capitalization. Prices may be numeric cells or text using a decimal comma.

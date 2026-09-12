import { Module } from '@nestjs/common';
import { ProductImportsController } from './product-imports.controller';
import { ProductImportsService } from './product-imports.service';
import { ProductImportWorker } from './product-import.worker';
import { ProductImageStorageService } from './product-image-storage.service';

@Module({
  controllers: [ProductImportsController],
  providers: [ProductImportsService, ProductImportWorker, ProductImageStorageService],
})
export class ProductImportsModule {}


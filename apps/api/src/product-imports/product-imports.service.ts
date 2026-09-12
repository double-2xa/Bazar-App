import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { resolve } from 'path';
import * as ExcelJS from 'exceljs';
import { Prisma, ProductImportRow } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductImageStorageService } from './product-image-storage.service';
import { AnalyzeProductImportDto, ProductImportRowsQueryDto, UpdateProductImportRowDto } from './dto/product-import.dto';

const REQUIRED_HEADERS = ['item', 'productnamear', 'productnameen', 'currname', 'pricea', 'wholesaleprice', 'categories', 'subcategories', 'image'];
const IMPORT_CHUNK_SIZE = 500;

type NormalizedImportRow = {
  excelRow: number;
  barcode: string | null;
  nameAr: string | null;
  nameEn: string | null;
  currency: string | null;
  normalPrice: number | null;
  companyPrice: number | null;
  categoryName: string | null;
  subcategoryName: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  sourceImage: string | null;
  stockQuantity: number | null;
  existingProductId: string | null;
  action: 'create' | 'skip' | 'overwrite';
  status: 'ready' | 'warning' | 'invalid';
  issues: string[];
};

@Injectable()
export class ProductImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ProductImageStorageService,
  ) {}

  async upload(userId: string, file?: { buffer: Buffer; originalname: string; size: number }) {
    if (!file?.buffer?.length) throw new BadRequestException('Excel file is required');
    if (!file.originalname.toLowerCase().endsWith('.xlsx') || file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) {
      throw new BadRequestException('Choose a valid .xlsx workbook');
    }

    const workbook = await this.loadWorkbook(file.buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('The workbook has no worksheets');
    const headers = this.readHeaders(worksheet);
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.has(header));
    if (missingHeaders.length) {
      throw new BadRequestException(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const importDirectory = resolve(process.cwd(), 'uploads', 'imports');
    await mkdir(importDirectory, { recursive: true });
    const storedName = `${randomUUID()}.xlsx`;
    const storedFilePath = resolve(importDirectory, storedName);
    await writeFile(storedFilePath, file.buffer, { flag: 'wx' });

    const firstDataRow = 2;
    const lastDataRow = worksheet.actualRowCount;
    const batch = await this.prisma.productImportBatch.create({
      data: {
        createdById: userId,
        originalName: file.originalname.slice(0, 255),
        storedFilePath,
        fileHash: hash,
        sheetName: worksheet.name,
        firstDataRow,
        lastDataRow,
        totalRows: Math.max(0, lastDataRow - 1),
      },
    });
    return { ...batch, headers: Array.from(headers.values()) };
  }

  async analyze(batchId: string, dto: AnalyzeProductImportDto) {
    const batch = await this.getBatch(batchId);
    if (batch.publishedRows > 0 || ['importing', 'completed', 'completed_with_errors'].includes(batch.status)) {
      throw new BadRequestException('This import has already been staged. Upload a new workbook to analyze another range');
    }
    if (!batch.lastDataRow) throw new BadRequestException('Workbook row information is unavailable');
    if (dto.fromRow > dto.toRow) throw new BadRequestException('From row must be before or equal to To row');
    if (dto.toRow > batch.lastDataRow) throw new BadRequestException(`To row cannot exceed ${batch.lastDataRow}`);
    if (dto.toRow - dto.fromRow + 1 > 50000) throw new BadRequestException('A single import can contain at most 50,000 products');

    await this.prisma.productImportBatch.update({ where: { id: batchId }, data: { status: 'analyzing', errorMessage: null } });
    try {
      const workbook = await this.loadWorkbook(await readFile(batch.storedFilePath));
      const worksheet = workbook.getWorksheet(batch.sheetName || '') || workbook.worksheets[0];
      const headers = this.readHeaders(worksheet);
      const imageByRow = this.embeddedImagesByRow(worksheet);
      const rawRows: Array<Omit<NormalizedImportRow, 'categoryId' | 'subcategoryId' | 'existingProductId' | 'action' | 'status' | 'issues'>> = [];

      for (let excelRow = dto.fromRow; excelRow <= dto.toRow; excelRow += 1) {
        const row = worksheet.getRow(excelRow);
        rawRows.push({
          excelRow,
          barcode: this.cellText(row.getCell(headers.get('item')!)),
          nameAr: this.cellText(row.getCell(headers.get('productnamear')!)),
          nameEn: this.cellText(row.getCell(headers.get('productnameen')!)),
          currency: this.cellText(row.getCell(headers.get('currname')!)),
          normalPrice: this.moneyValue(row.getCell(headers.get('pricea')!)),
          companyPrice: this.moneyValue(row.getCell(headers.get('wholesaleprice')!)),
          categoryName: this.cellText(row.getCell(headers.get('categories')!)),
          subcategoryName: this.cellText(row.getCell(headers.get('subcategories')!)),
          sourceImage: this.cellText(row.getCell(headers.get('image')!)) || imageByRow.get(excelRow) || null,
          stockQuantity: headers.has('stock') ? this.integerValue(row.getCell(headers.get('stock')!)) : null,
        });
      }

      const barcodes = rawRows.map((row) => row.barcode).filter((value): value is string => Boolean(value));
      const existingProducts = await this.findExistingProducts(barcodes);
      const existingByBarcode = new Map(existingProducts.map((product) => [product.barcode!, product.id]));
      const categories = await this.prisma.category.findMany({ include: { subcategories: true } });
      const categoryByName = new Map(categories.map((category) => [this.normalizeText(category.name), category]));
      const seenBarcodes = new Set<string>();

      const normalizedRows: NormalizedImportRow[] = rawRows.map((row) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        if (!row.barcode) errors.push('MISSING_BARCODE');
        if (!row.nameAr && !row.nameEn) errors.push('MISSING_PRODUCT_NAME');
        if (row.normalPrice === null || row.normalPrice < 0) errors.push('INVALID_RETAIL_PRICE');
        if ((row.currency || '').toUpperCase() !== 'USD') errors.push('INVALID_CURRENCY');
        if (!row.nameEn) warnings.push('MISSING_ENGLISH_NAME');
        if (row.companyPrice === null) warnings.push('MISSING_WHOLESALE_PRICE');
        if (!row.sourceImage) warnings.push('MISSING_IMAGE');
        if (row.sourceImage && !row.sourceImage.startsWith('embedded:')) {
          try {
            const imageUrl = new URL(row.sourceImage);
            if (!['http:', 'https:'].includes(imageUrl.protocol)) warnings.push('INVALID_IMAGE_URL');
            if (/\.gif$/i.test(imageUrl.pathname)) warnings.push('UNSUPPORTED_IMAGE_FORMAT');
          } catch { warnings.push('INVALID_IMAGE_URL'); }
        }

        const category = row.categoryName ? categoryByName.get(this.normalizeText(row.categoryName)) : undefined;
        if (row.categoryName && !category) warnings.push('UNKNOWN_CATEGORY');
        const subcategory = category && row.subcategoryName
          ? category.subcategories.find((candidate) => this.normalizeText(candidate.name) === this.normalizeText(row.subcategoryName!))
          : undefined;
        if (row.subcategoryName && !subcategory) warnings.push('UNKNOWN_SUBCATEGORY');

        const existingProductId = row.barcode ? existingByBarcode.get(row.barcode) || null : null;
        let action: NormalizedImportRow['action'] = existingProductId ? 'skip' : 'create';
        if (existingProductId) warnings.push('EXISTING_BARCODE');
        if (row.barcode && seenBarcodes.has(row.barcode)) {
          warnings.push('DUPLICATE_IN_FILE');
          action = 'skip';
        }
        if (row.barcode) seenBarcodes.add(row.barcode);
        const issues = [...errors, ...warnings];
        return {
          ...row,
          categoryId: category?.id || null,
          subcategoryId: subcategory?.id || null,
          existingProductId,
          action,
          status: errors.length ? 'invalid' : warnings.length ? 'warning' : 'ready',
          issues,
        };
      });

      await this.prisma.$transaction([
        this.prisma.productImportRow.deleteMany({ where: { batchId } }),
        this.prisma.productImportBatch.update({
          where: { id: batchId },
          data: {
            selectedFromRow: dto.fromRow,
            selectedToRow: dto.toRow,
            selectedRows: normalizedRows.length,
            readyRows: normalizedRows.filter((row) => row.status === 'ready').length,
            warningRows: normalizedRows.filter((row) => row.status === 'warning').length,
            invalidRows: normalizedRows.filter((row) => row.status === 'invalid').length,
            duplicateRows: normalizedRows.filter((row) => row.issues.includes('EXISTING_BARCODE') || row.issues.includes('DUPLICATE_IN_FILE')).length,
            importedRows: 0,
            publishedRows: 0,
            skippedRows: 0,
            failedRows: 0,
            status: 'ready',
            analyzedAt: new Date(),
            completedAt: null,
          },
        }),
      ]);
      for (let offset = 0; offset < normalizedRows.length; offset += IMPORT_CHUNK_SIZE) {
        const chunk = normalizedRows.slice(offset, offset + IMPORT_CHUNK_SIZE);
        await this.prisma.productImportRow.createMany({
          data: chunk.map((row) => ({ ...row, batchId, issues: row.issues as Prisma.InputJsonValue })),
        });
      }
      return this.getBatchSummary(batchId);
    } catch (error) {
      await this.prisma.productImportBatch.update({
        where: { id: batchId },
        data: { status: 'failed', errorMessage: error instanceof Error ? error.message.slice(0, 1000) : 'Analysis failed' },
      });
      throw error;
    }
  }

  async listBatches(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.productImportBatch.findMany({
        include: { createdBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.productImportBatch.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getBatchSummary(batchId: string) {
    const batch = await this.prisma.productImportBatch.findUnique({
      where: { id: batchId }, include: { createdBy: { select: { fullName: true } } },
    });
    if (!batch) throw new NotFoundException('Import batch not found');
    return batch;
  }

  async listRows(batchId: string | undefined, query: ProductImportRowsQueryDto) {
    const where: Prisma.ProductImportRowWhereInput = {};
    if (batchId) where.batchId = batchId;
    if (query.status && query.status !== 'all') where.status = query.status as Prisma.EnumProductImportRowStatusFilter['equals'];
    if (query.search) {
      where.OR = [
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { nameAr: { contains: query.search, mode: 'insensitive' } },
        { nameEn: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.productImportRow.findMany({
        where, include: { batch: { select: { originalName: true, createdAt: true } } },
        orderBy: [{ batch: { createdAt: 'desc' } }, { excelRow: 'asc' }],
        skip: (query.page - 1) * query.limit, take: query.limit,
      }),
      this.prisma.productImportRow.count({ where }),
    ]);
    return { data: data.map((row) => this.formatRow(row)), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }

  async updateRow(id: string, dto: UpdateProductImportRowDto) {
    const row = await this.prisma.productImportRow.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Imported product not found');
    if (!['ready', 'warning', 'imported'].includes(row.status)) throw new BadRequestException('This imported row can no longer be changed');
    const rowIssues = Array.isArray(row.issues) ? row.issues.filter((item): item is string => typeof item === 'string') : [];
    if (dto.action === 'overwrite' && rowIssues.includes('DUPLICATE_IN_FILE')) throw new BadRequestException('Choose the first occurrence of this barcode; repeated workbook rows must be skipped');
    if (dto.action === 'overwrite' && !row.existingProductId) throw new BadRequestException('Only an existing barcode can be overwritten');
    const nextNameAr = dto.nameAr !== undefined ? dto.nameAr : row.nameAr;
    const nextNameEn = dto.nameEn !== undefined ? dto.nameEn : row.nameEn;
    if (!nextNameAr && !nextNameEn) throw new BadRequestException('At least one product name is required');
    if (dto.subcategoryId) {
      const subcategory = await this.prisma.subcategory.findUnique({ where: { id: dto.subcategoryId } });
      if (!subcategory || (dto.categoryId && subcategory.categoryId !== dto.categoryId)) throw new BadRequestException('Subcategory does not belong to the selected category');
    }
    const updated = await this.prisma.productImportRow.update({ where: { id }, data: dto });
    return this.formatRow(updated);
  }

  async bulkDuplicateAction(batchId: string, action: 'skip' | 'overwrite') {
    await this.getBatch(batchId);
    const candidates = await this.prisma.productImportRow.findMany({ where: { batchId, existingProductId: { not: null }, status: { in: ['ready', 'warning'] } }, select: { id: true, issues: true } });
    const ids = candidates.filter((row) => !Array.isArray(row.issues) || !row.issues.includes('DUPLICATE_IN_FILE')).map((row) => row.id);
    const result = await this.prisma.productImportRow.updateMany({ where: { id: { in: ids } }, data: { action } });
    return { updated: result.count };
  }

  async uploadRowImage(rowId: string, bytes: Buffer) {
    const row = await this.prisma.productImportRow.findUnique({ where: { id: rowId } });
    if (!row) throw new NotFoundException('Imported product not found');
    if (!['warning', 'imported'].includes(row.status)) throw new BadRequestException('This imported row can no longer be changed');
    const storedImageUrl = await this.imageStorage.storeBytes(bytes);
    const issues = Array.isArray(row.issues)
      ? row.issues.filter((issue) => typeof issue === 'string' && !['MISSING_IMAGE', 'IMAGE_DOWNLOAD_FAILED', 'INVALID_IMAGE_URL', 'UNSUPPORTED_IMAGE_FORMAT'].includes(issue))
      : [];
    const updated = await this.prisma.productImportRow.update({ where: { id: rowId }, data: { storedImageUrl, issues, errorMessage: null } });
    return this.formatRow(updated);
  }

  async deleteRows(rowIds: string[]) {
    const uniqueIds = [...new Set(rowIds)];
    const rows = await this.prisma.productImportRow.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, batchId: true, status: true, storedImageUrl: true },
    });
    if (rows.length !== uniqueIds.length) throw new NotFoundException('One or more imported products no longer exist');
    if (rows.some((row) => row.status === 'published')) {
      throw new BadRequestException('Published products must be deleted from the live Products page');
    }

    await this.prisma.productImportRow.deleteMany({ where: { id: { in: uniqueIds }, status: { not: 'published' } } });
    for (const batchId of [...new Set(rows.map((row) => row.batchId))]) {
      const counts = await this.rowCounts(batchId);
      await this.prisma.productImportBatch.update({ where: { id: batchId }, data: counts });
    }
    await Promise.all(rows.map((row) => this.removeUnusedImportedImage(row.storedImageUrl)));
    return { deleted: rows.length };
  }

  private async removeUnusedImportedImage(imageUrl: string | null) {
    if (!imageUrl) return;
    let pathname: string;
    try { pathname = new URL(imageUrl, 'https://local.invalid').pathname; } catch { return; }
    const match = pathname.match(/^\/(?:api\/)?uploads\/products\/([a-f0-9-]+\.(?:jpg|png|webp))$/i);
    if (!match) return;
    const [otherRows, products, productImages] = await Promise.all([
      this.prisma.productImportRow.count({ where: { storedImageUrl: imageUrl } }),
      this.prisma.product.count({ where: { imageUrl } }),
      this.prisma.productImage.count({ where: { imageUrl } }),
    ]);
    if (otherRows || products || productImages) return;
    try { await unlink(resolve(process.cwd(), 'uploads', 'products', match[1])); } catch { /* Already absent. */ }
  }

  async queueImport(batchId: string) {
    const batch = await this.getBatch(batchId);
    if (batch.status !== 'ready') throw new BadRequestException('Analyze the workbook before importing it');
    await this.prisma.$transaction([
      this.prisma.productImportRow.updateMany({ where: { batchId, action: 'skip', status: { in: ['ready', 'warning'] } }, data: { status: 'skipped' } }),
      this.prisma.productImportBatch.update({ where: { id: batchId }, data: { status: 'importing', errorMessage: null } }),
    ]);
    return { message: 'Import queued', batchId };
  }

  async processNextQueuedBatch() {
    const batch = await this.prisma.productImportBatch.findFirst({ where: { status: 'importing' }, orderBy: { updatedAt: 'asc' } });
    if (!batch) return false;
    const rows = await this.prisma.productImportRow.findMany({
      where: { batchId: batch.id, status: { in: ['ready', 'warning'] }, action: { not: 'skip' } }, orderBy: { excelRow: 'asc' }, take: 20,
    });
    if (!rows.length) {
      const counts = await this.rowCounts(batch.id);
      await this.prisma.productImportBatch.update({
        where: { id: batch.id },
        data: { ...counts, status: counts.failedRows || counts.invalidRows ? 'completed_with_errors' : 'completed', completedAt: new Date() },
      });
      return true;
    }

    let workbook: ExcelJS.Workbook | null = null;
    if (rows.some((row) => row.sourceImage?.startsWith('embedded:'))) workbook = await this.loadWorkbook(await readFile(batch.storedFilePath));
    const concurrency = Math.max(1, Math.min(8, Number(process.env.IMPORT_IMAGE_CONCURRENCY || 5)));
    for (let offset = 0; offset < rows.length; offset += concurrency) {
      await Promise.all(rows.slice(offset, offset + concurrency).map(async (row) => {
        try {
          let storedImageUrl = row.storedImageUrl;
          if (!storedImageUrl && row.sourceImage?.startsWith('http')) storedImageUrl = await this.imageStorage.storeRemote(row.sourceImage);
          if (!storedImageUrl && row.sourceImage?.startsWith('embedded:') && workbook) {
            const image = workbook.getImage(Number(row.sourceImage.slice('embedded:'.length)));
            if (image?.buffer) storedImageUrl = await this.imageStorage.storeBytes(Buffer.from(image.buffer));
          }
          await this.prisma.productImportRow.update({ where: { id: row.id }, data: { storedImageUrl, status: 'imported', errorMessage: null } });
        } catch (error) {
          const issues = Array.isArray(row.issues) ? row.issues.filter((item): item is string => typeof item === 'string') : [];
          if (!issues.includes('IMAGE_DOWNLOAD_FAILED')) issues.push('IMAGE_DOWNLOAD_FAILED');
          await this.prisma.productImportRow.update({
            where: { id: row.id },
            data: { issues, status: 'imported', errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Image download failed' },
          });
        }
      }));
    }
    const counts = await this.rowCounts(batch.id);
    await this.prisma.productImportBatch.update({ where: { id: batch.id }, data: counts });
    return true;
  }

  async publish(rowIds?: string[]) {
    const rows = await this.prisma.productImportRow.findMany({
      where: { id: rowIds?.length ? { in: rowIds } : undefined, status: 'imported', action: { in: ['create', 'overwrite'] } },
      orderBy: { createdAt: 'asc' }, take: rowIds?.length ? Math.min(rowIds.length, 100) : 100,
    });
    if (!rows.length) throw new BadRequestException('No imported products are ready to publish');
    const results: Array<{ rowId: string; productId?: string; error?: string }> = [];
    for (const row of rows) {
      try {
        const productId = await this.publishRow(row);
        results.push({ rowId: row.id, productId });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'Publishing failed';
        await this.prisma.productImportRow.update({ where: { id: row.id }, data: { status: 'failed', errorMessage: message } });
        results.push({ rowId: row.id, error: message });
      }
    }
    const batchIds = [...new Set(rows.map((row) => row.batchId))];
    for (const batchId of batchIds) {
      const counts = await this.rowCounts(batchId);
      await this.prisma.productImportBatch.update({ where: { id: batchId }, data: counts });
    }
    return { published: results.filter((result) => result.productId).length, failed: results.filter((result) => result.error).length, results };
  }

  private async publishRow(row: ProductImportRow): Promise<string> {
    if (!row.barcode || (!row.nameAr && !row.nameEn) || row.normalPrice === null) throw new BadRequestException('Required product data is missing');
    const barcode = row.barcode;
    const normalPrice = row.normalPrice;
    const displayName = row.nameEn || row.nameAr!;
    const imageUrl = row.storedImageUrl ? this.imageStorage.publicUrl(row.storedImageUrl) : undefined;
    return this.prisma.$transaction(async (tx) => {
      if (row.action === 'overwrite') {
        if (!row.existingProductId) throw new BadRequestException('Existing product is unavailable');
        const product = await tx.product.update({
          where: { id: row.existingProductId },
          data: {
            barcode,
            name: displayName,
            nameAr: row.nameAr,
            nameEn: row.nameEn,
            normalPrice,
            ...(row.companyPrice !== null ? { companyPrice: row.companyPrice } : {}),
            ...(row.categoryId ? { categoryId: row.categoryId } : {}),
            ...(row.subcategoryId ? { subcategoryId: row.subcategoryId } : {}),
            ...(row.stockQuantity !== null ? { stockQuantity: row.stockQuantity } : {}),
            ...(imageUrl ? { imageUrl } : {}),
          },
        });
        await tx.productImportRow.update({ where: { id: row.id }, data: { status: 'published', publishedProductId: product.id, errorMessage: null } });
        return product.id;
      }
      const slug = await this.uniqueSlug(tx, displayName, barcode);
      const product = await tx.product.create({
        data: {
          barcode,
          sku: `NP-${barcode}`,
          name: displayName,
          nameAr: row.nameAr,
          nameEn: row.nameEn,
          slug,
          description: null,
          normalPrice,
          companyPrice: row.companyPrice,
          categoryId: row.categoryId,
          subcategoryId: row.subcategoryId,
          stockQuantity: row.stockQuantity ?? 50,
          imageUrl,
          isActive: true,
          images: imageUrl ? { create: [{ imageUrl, sortOrder: 0 }] } : undefined,
        },
      });
      await tx.productImportRow.update({ where: { id: row.id }, data: { status: 'published', publishedProductId: product.id, errorMessage: null } });
      return product.id;
    });
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string, barcode: string) {
    const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
    const candidate = `${base}-${barcode.slice(-8)}`.slice(0, 180);
    const exists = await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    return exists ? `${candidate}-${randomUUID().slice(0, 6)}` : candidate;
  }

  private async getBatch(id: string) {
    const batch = await this.prisma.productImportBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Import batch not found');
    return batch;
  }

  private async loadWorkbook(bytes: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as any);
    return workbook;
  }

  private readHeaders(worksheet: ExcelJS.Worksheet) {
    const headers = new Map<string, number>();
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
      headers.set(this.normalizeHeader(this.cellText(cell) || ''), column);
    });
    return headers;
  }

  private normalizeHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }
  private normalizeText(value: string) { return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase(); }

  private cellText(cell: ExcelJS.Cell): string | null {
    const value = cell.value;
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') {
      if ('text' in value && typeof value.text === 'string') return value.text.trim() || null;
      if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink.trim() || null;
      if ('result' in value && value.result !== undefined && value.result !== null) return String(value.result).trim() || null;
      if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((part: { text: string }) => part.text).join('').trim() || null;
    }
    return String(value).trim() || null;
  }

  private moneyValue(cell: ExcelJS.Cell): number | null {
    if (typeof cell.value === 'number') return Number.isFinite(cell.value) ? Math.round(cell.value * 100) / 100 : null;
    const text = this.cellText(cell)?.replace(/\s/g, '').replace(',', '.');
    if (!text) return null;
    const value = Number(text);
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  }

  private integerValue(cell: ExcelJS.Cell): number | null {
    const text = this.cellText(cell);
    if (!text) return null;
    const value = Number(text);
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  private embeddedImagesByRow(worksheet: ExcelJS.Worksheet) {
    const images = new Map<number, string>();
    for (const image of worksheet.getImages()) {
      const nativeRow = image.range.tl.nativeRow;
      if (typeof nativeRow === 'number') images.set(nativeRow + 1, `embedded:${image.imageId}`);
    }
    return images;
  }

  private async findExistingProducts(barcodes: string[]) {
    const unique = [...new Set(barcodes)];
    const products: Array<{ id: string; barcode: string | null }> = [];
    for (let offset = 0; offset < unique.length; offset += 5000) {
      products.push(...await this.prisma.product.findMany({ where: { barcode: { in: unique.slice(offset, offset + 5000) } }, select: { id: true, barcode: true } }));
    }
    return products;
  }

  private async rowCounts(batchId: string) {
    const grouped = await this.prisma.productImportRow.groupBy({ by: ['status'], where: { batchId }, _count: true });
    const count = (status: string) => grouped.find((item) => item.status === status)?._count || 0;
    return {
      importedRows: count('imported') + count('published'), publishedRows: count('published'), skippedRows: count('skipped'), failedRows: count('failed'), invalidRows: count('invalid'),
    };
  }

  private formatRow<T extends { normalPrice: unknown; companyPrice: unknown; storedImageUrl?: string | null }>(row: T) {
    return {
      ...row,
      normalPrice: row.normalPrice === null ? null : Number(row.normalPrice),
      companyPrice: row.companyPrice === null ? null : Number(row.companyPrice),
      ...(row.storedImageUrl ? { storedImageUrl: this.imageStorage.publicUrl(row.storedImageUrl) } : {}),
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import { ProductsService } from './products.service';
import { AdminProductQueryDto, BulkDeleteProductsDto, CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { OptionalAuth, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @OptionalAuth()
  @Get()
  findAll(@Query() query: ProductQueryDto, @CurrentUser() user?: JwtPayload) {
    if (process.env.CATALOG_ADMIN_ONLY !== 'false' && user?.role !== 'admin') return this.productsService.emptyCatalog(query.page, query.limit);
    return this.productsService.findAll({
      ...query,
      featured: query.featured === 'true',
    });
  }

  @OptionalAuth()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string, @CurrentUser() user?: JwtPayload) {
    if (process.env.CATALOG_ADMIN_ONLY !== 'false' && user?.role !== 'admin') throw new NotFoundException('Product not found');
    return this.productsService.findBySlug(slug);
  }

  @Roles('admin')
  @Get('admin/all')
  findAllForAdmin(@Query() query: AdminProductQueryDto) {
    return this.productsService.findAll({
      ...query,
      includeInactive: true,
      active: query.status === 'live' ? true : query.status === 'inactive' ? false : undefined,
    });
  }

  @Roles('admin')
  @Post('admin/upload-image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async uploadProductImage(
    @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Image file is required');

    const bytes = file.buffer;
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    const extension = isJpeg ? 'jpg' : isPng ? 'png' : isWebp ? 'webp' : null;
    if (!extension) throw new BadRequestException('Only valid JPEG, PNG, or WebP images are allowed');

    const uploadDirectory = resolve(process.cwd(), 'uploads', 'products');
    await mkdir(uploadDirectory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(resolve(uploadDirectory, filename), bytes, { flag: 'wx' });
    return { path: `/api/uploads/products/${filename}` };
  }

  @Roles('admin')
  @Delete('admin/bulk')
  bulkRemove(@Body() dto: BulkDeleteProductsDto) {
    return this.productsService.bulkRemove(dto.productIds);
  }

  @OptionalAuth()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    if (process.env.CATALOG_ADMIN_ONLY !== 'false' && user?.role !== 'admin') throw new NotFoundException('Product not found');
    return this.productsService.findOne(id);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

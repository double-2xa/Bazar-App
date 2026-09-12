import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { AnalyzeProductImportDto, BulkProductImportActionDto, ProductImportRowsQueryDto, PublishProductImportRowsDto, UpdateProductImportRowDto } from './dto/product-import.dto';
import { ProductImportsService } from './product-imports.service';

@Roles('admin')
@Controller('product-imports')
export class ProductImportsController {
  constructor(private readonly imports: ProductImportsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 60 * 1024 * 1024, files: 1 } }))
  upload(@CurrentUser('sub') userId: string, @UploadedFile() file?: { buffer: Buffer; originalname: string; size: number }) {
    if (!file) throw new BadRequestException('Excel file is required');
    return this.imports.upload(userId, file);
  }

  @Get()
  list(@Query() query: PaginationQueryDto) { return this.imports.listBatches(query.page, query.limit); }

  @Get('imported')
  imported(@Query() query: ProductImportRowsQueryDto) { return this.imports.listRows(undefined, query); }

  @Post('publish')
  publish(@Body() dto: PublishProductImportRowsDto) { return this.imports.publish(dto.rowIds); }

  @Post('rows/:rowId/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadRowImage(@Param('rowId') rowId: string, @UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer?.length) throw new BadRequestException('Image file is required');
    return this.imports.uploadRowImage(rowId, file.buffer);
  }

  @Get(':id')
  get(@Param('id') id: string) { return this.imports.getBatchSummary(id); }

  @Post(':id/analyze')
  analyze(@Param('id') id: string, @Body() dto: AnalyzeProductImportDto) { return this.imports.analyze(id, dto); }

  @Get(':id/rows')
  rows(@Param('id') id: string, @Query() query: ProductImportRowsQueryDto) { return this.imports.listRows(id, query); }

  @Patch('rows/:rowId')
  updateRow(@Param('rowId') rowId: string, @Body() dto: UpdateProductImportRowDto) { return this.imports.updateRow(rowId, dto); }

  @Patch(':id/duplicates')
  duplicates(@Param('id') id: string, @Body() dto: BulkProductImportActionDto) { return this.imports.bulkDuplicateAction(id, dto.action); }

  @Post(':id/import')
  queue(@Param('id') id: string) { return this.imports.queueImport(id); }
}

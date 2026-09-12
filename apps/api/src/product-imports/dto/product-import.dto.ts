import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AnalyzeProductImportDto {
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(100000)
  fromRow!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(100000)
  toRow!: number;
}

export class ProductImportRowsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['all', 'ready', 'warning', 'invalid', 'skipped', 'imported', 'published', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateProductImportRowDto {
  @IsOptional()
  @IsIn(['create', 'skip', 'overwrite'])
  action?: 'create' | 'skip' | 'overwrite';

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string | null;

  @IsOptional()
  @IsString()
  nameAr?: string | null;

  @IsOptional()
  @IsString()
  nameEn?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  normalPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  companyPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number | null;
}

export class BulkProductImportActionDto {
  @IsIn(['skip', 'overwrite'])
  action!: 'skip' | 'overwrite';
}

export class PublishProductImportRowsDto {
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  rowIds?: string[];
}

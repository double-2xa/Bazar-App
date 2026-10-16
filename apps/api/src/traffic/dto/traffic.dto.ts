import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, Matches } from 'class-validator';

export class RecordWebsiteVisitDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @MaxLength(300)
  @Matches(/^\//)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;
}

export class TrafficQueryDto {
  @IsOptional()
  @IsIn(['1', '7', '30', '90'])
  days = '7';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  limit = 25;
}

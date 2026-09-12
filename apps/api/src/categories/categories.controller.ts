import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Public, Roles } from '../common/decorators/roles.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll(@Query('all') all?: string) {
    return this.categoriesService.findAll(all !== 'true');
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Roles('admin')
  @Post(':id/subcategories')
  createSubcategory(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.createSubcategory(id, dto);
  }

  @Roles('admin')
  @Patch('subcategories/:id')
  updateSubcategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.updateSubcategory(id, dto);
  }

  @Roles('admin')
  @Delete('subcategories/:id')
  removeSubcategory(@Param('id') id: string) {
    return this.categoriesService.removeSubcategory(id);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly = true) {
    return this.prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      include: { subcategories: { where: activeOnly ? { isActive: true } : undefined, orderBy: { name: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException(
        `Category cannot be deleted while it contains ${productCount} product${productCount === 1 ? '' : 's'}. Move or delete them first.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  async createSubcategory(categoryId: string, dto: CreateCategoryDto) {
    await this.findOne(categoryId);
    return this.prisma.subcategory.create({ data: { ...dto, categoryId } });
  }

  async updateSubcategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subcategory not found');
    return this.prisma.subcategory.update({ where: { id }, data: dto });
  }

  async removeSubcategory(id: string) {
    const existing = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subcategory not found');
    await this.prisma.subcategory.delete({ where: { id } });
    return { message: 'Subcategory deleted' };
  }
}

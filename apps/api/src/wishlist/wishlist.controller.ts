import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsUUID } from 'class-validator';

class AddWishlistDto {
  @IsUUID()
  productId!: string;
}

@Controller('wishlist')
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser('sub') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Post()
  add(@CurrentUser('sub') userId: string, @Body() dto: AddWishlistDto) {
    return this.wishlistService.add(userId, dto.productId);
  }

  @Delete(':productId')
  remove(@CurrentUser('sub') userId: string, @Param('productId') productId: string) {
    return this.wishlistService.remove(userId, productId);
  }
}

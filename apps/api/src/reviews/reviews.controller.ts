import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get('products/:id/reviews')
  getProductReviews(@Param('id') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Post('reviews')
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @Roles('admin')
  @Delete('reviews/:id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}

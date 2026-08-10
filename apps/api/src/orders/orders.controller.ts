import { Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, role, dto);
  }

  @Get('my-orders')
  getMyOrders(@CurrentUser('sub') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get('delivery-quote')
  getDeliveryQuote(
    @CurrentUser('sub') userId: string,
    @Query('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.ordersService.getDeliveryQuote(userId, addressId);
  }

  @Get(':id')
  getOrder(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrder(userId, role, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelOrder(userId, id);
  }

  @Post(':id/whish/verify')
  verifyWhish(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.verifyWhishPayment(userId, id);
  }
}

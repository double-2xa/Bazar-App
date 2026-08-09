import { Controller, Get, Post, Patch, Body, Headers, Param, Query, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { isUUID } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new BadRequestException('Idempotency-Key header must be a UUID v4');
    }
    return this.ordersService.create(userId, role, dto, idempotencyKey);
  }

  @Get('my-orders')
  getMyOrders(@CurrentUser('sub') userId: string, @Query() query: PaginationQueryDto) {
    return this.ordersService.getMyOrders(userId, query.page, query.limit);
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

  @Get(':id/invoice')
  async getInvoice(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const invoice = await this.ordersService.getInvoice(userId, role, id);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': invoice.length,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(invoice);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelOrder(userId, id);
  }
}

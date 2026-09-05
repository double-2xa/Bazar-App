import { Controller, Get, Post, Patch, Body, Headers, Param, Query, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { isUUID } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateGuestOrderDto, CreateOrderDto, GuestDeliveryQuoteDto } from './dto/order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  private assertIdempotencyKey(idempotencyKey?: string) {
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new BadRequestException('Idempotency-Key header must be a UUID v4');
    }
    return idempotencyKey;
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(userId, role, dto, this.assertIdempotencyKey(idempotencyKey));
  }

  @Public()
  @Post('guest')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  createGuest(
    @Body() dto: CreateGuestOrderDto,
    @Headers('x-guest-order-token') guestToken?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.createGuest(dto, guestToken, this.assertIdempotencyKey(idempotencyKey));
  }

  @Public()
  @Post('guest/delivery-quote')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  getGuestDeliveryQuote(@Body() dto: GuestDeliveryQuoteDto) {
    return this.ordersService.getGuestDeliveryQuote(dto);
  }

  @Public()
  @Get('guest/my-orders')
  getGuestOrders(@Headers('x-guest-order-token') token: string | undefined, @Query() query: PaginationQueryDto) {
    return this.ordersService.getGuestOrders(token, query.page, query.limit);
  }

  @Public()
  @Get('guest-invoice/:token')
  async getGuestInvoiceByToken(@Param('token') token: string, @Res() response: Response) {
    const invoice = await this.ordersService.getGuestInvoiceByToken(token);
    this.sendInvoice(response, invoice, 'guest');
  }

  @Public()
  @Get('guest/:id/invoice')
  async getGuestInvoice(
    @Headers('x-guest-order-token') token: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const invoice = await this.ordersService.getGuestInvoice(token, id);
    this.sendInvoice(response, invoice, id);
  }

  @Public()
  @Get('guest/:id')
  getGuestOrder(@Headers('x-guest-order-token') token: string | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getGuestOrder(token, id);
  }

  @Public()
  @Patch('guest/:id/cancel')
  cancelGuest(@Headers('x-guest-order-token') token: string | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancelGuestOrder(token, id);
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
    this.sendInvoice(response, invoice, id);
  }

  private sendInvoice(response: Response, invoice: Buffer, filename: string) {
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${filename}.pdf"`,
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

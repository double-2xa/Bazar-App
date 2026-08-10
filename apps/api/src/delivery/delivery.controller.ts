import { Controller, Get, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryProofDto, DeliveryRejectDto } from './dto/delivery.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('delivery')
@Roles('delivery_agent')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('notifications')
  getNotifications(
    @CurrentUser('sub') agentId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.deliveryService.getNotifications(agentId, unreadOnly === 'true');
  }

  @Patch('notifications/:id/read')
  markNotificationRead(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deliveryService.markNotificationRead(agentId, id);
  }

  @Get('orders')
  getOrders(@CurrentUser('sub') agentId: string, @Query('status') status?: string) {
    return this.deliveryService.getAssignedOrders(agentId, status);
  }

  @Get('orders/completed/history')
  getCompletedOrders(@CurrentUser('sub') agentId: string, @Query() query: PaginationQueryDto) {
    return this.deliveryService.getCompletedOrders(agentId, query.page, query.limit);
  }

  @Get('orders/available')
  getAvailableOrders() {
    return this.deliveryService.getAvailableOrders();
  }

  @Patch('orders/:id/lock')
  lockOrder(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.deliveryService.lockOrder(agentId, orderId);
  }

  @Get('orders/:id')
  getOrder(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.deliveryService.getOrder(agentId, orderId);
  }

  @Patch('orders/:id/accept')
  acceptOrder(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.deliveryService.acceptOrder(agentId, orderId);
  }

  @Patch('orders/:id/reject')
  rejectOrder(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: DeliveryRejectDto,
  ) {
    return this.deliveryService.rejectOrder(agentId, orderId, dto.reason);
  }

  @Patch('orders/:id/picked-up')
  markPickedUp(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.deliveryService.markPickedUp(agentId, orderId);
  }

  @Patch('orders/:id/on-the-way')
  markOnTheWay(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.deliveryService.markOnTheWay(agentId, orderId);
  }

  @Patch('orders/:id/delivered')
  markDelivered(
    @CurrentUser('sub') agentId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: DeliveryProofDto,
  ) {
    return this.deliveryService.markDelivered(agentId, orderId, dto);
  }
}

import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryProofDto } from './dto/delivery.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('delivery')
@Roles('delivery_agent')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('orders')
  getOrders(@CurrentUser('sub') agentId: string, @Query('status') status?: string) {
    return this.deliveryService.getAssignedOrders(agentId, status);
  }

  @Get('orders/:id')
  getOrder(@CurrentUser('sub') agentId: string, @Param('id') orderId: string) {
    return this.deliveryService.getOrder(agentId, orderId);
  }

  @Patch('orders/:id/picked-up')
  markPickedUp(@CurrentUser('sub') agentId: string, @Param('id') orderId: string) {
    return this.deliveryService.markPickedUp(agentId, orderId);
  }

  @Patch('orders/:id/on-the-way')
  markOnTheWay(@CurrentUser('sub') agentId: string, @Param('id') orderId: string) {
    return this.deliveryService.markOnTheWay(agentId, orderId);
  }

  @Patch('orders/:id/delivered')
  markDelivered(
    @CurrentUser('sub') agentId: string,
    @Param('id') orderId: string,
    @Body() dto: DeliveryProofDto,
  ) {
    return this.deliveryService.markDelivered(agentId, orderId, dto);
  }
}

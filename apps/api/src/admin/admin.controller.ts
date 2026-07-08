import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { OrdersService } from '../orders/orders.service';
import { CreateDeliveryAgentDto } from './dto/admin.dto';
import { UpdateOrderStatusDto, AssignDeliveryAgentDto } from '../orders/dto/order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private ordersService: OrdersService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      role,
    });
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Get('company-accounts')
  getCompanyAccounts(@Query('status') status?: string) {
    return this.adminService.getCompanyAccounts(status);
  }

  @Patch('company-accounts/:id/approve')
  approveCompany(@Param('id') id: string) {
    return this.adminService.approveCompany(id);
  }

  @Patch('company-accounts/:id/reject')
  rejectCompany(@Param('id') id: string) {
    return this.adminService.rejectCompany(id);
  }

  @Post('delivery-agents')
  createDeliveryAgent(@Body() dto: CreateDeliveryAgentDto) {
    return this.adminService.createDeliveryAgent(dto);
  }

  @Get('orders')
  getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getAllOrders({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
    });
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.ordersService.updateStatus(id, dto.status, adminId, dto.note);
  }

  @Patch('orders/:id/assign-delivery-agent')
  assignDeliveryAgent(
    @Param('id') id: string,
    @Body() dto: AssignDeliveryAgentDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.ordersService.assignDeliveryAgent(id, dto.deliveryAgentId, adminId);
  }

  @Get('reviews')
  getReviews() {
    return this.adminService.getAllReviews();
  }
}

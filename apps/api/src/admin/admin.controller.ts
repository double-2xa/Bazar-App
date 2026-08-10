import { Controller, Get, Patch, Post, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { OrdersService } from '../orders/orders.service';
import { CreateDeliveryAgentDto } from './dto/admin.dto';
import { UpdateOrderStatusDto, AssignDeliveryAgentDto, UpdatePaymentStatusDto } from '../orders/dto/order.dto';
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
    @Query('status') status?: string,
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      role,
      status,
    });
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.activateUser(id);
  }

  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Delete('users/rejected')
  deleteAllRejectedUsers(@CurrentUser('sub') adminId: string) {
    return this.adminService.deleteAllRejectedCompanyUsers(adminId);
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.deleteUser(id, adminId);
  }

  @Get('company-accounts')
  getCompanyAccounts(@Query('status') status?: string) {
    return this.adminService.getCompanyAccounts(status);
  }

  @Patch('company-accounts/:id/approve')
  approveCompany(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveCompany(id);
  }

  @Patch('company-accounts/:id/reject')
  rejectCompany(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectCompany(id);
  }

  @Post('delivery-agents')
  createDeliveryAgent(@Body() dto: CreateDeliveryAgentDto) {
    return this.adminService.createDeliveryAgent(dto);
  }

  @Get('delivery-agents')
  getDeliveryAgents() {
    return this.adminService.getDeliveryAgents();
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

  @Get('orders/:id')
  getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.ordersService.getOrder(adminId, 'admin', id);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.ordersService.updateStatus(id, dto.status, adminId, dto.note, {
      validateAdmin: true,
    });
  }

  @Patch('orders/:id/payment-status')
  updatePaymentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.ordersService.updatePaymentStatus(id, dto.paymentStatus, adminId);
  }

  @Patch('orders/:id/assign-delivery-agent')
  assignDeliveryAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryAgentDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.ordersService.assignDeliveryAgent(id, dto.deliveryAgentId, adminId);
  }

  @Patch('orders/:id/unassign-delivery-agent')
  unassignDeliveryAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.ordersService.unassignDeliveryAgent(id, adminId);
  }

  @Get('reviews')
  getReviews() {
    return this.adminService.getAllReviews();
  }
}

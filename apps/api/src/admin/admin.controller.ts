import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { OrdersService } from "../orders/orders.service";
import {
  AdminOrdersQueryDto,
  AdminUsersQueryDto,
  CreateAdminUserDto,
  CreateDeliveryAgentDto,
  UpdateAdminUserDto,
  UpdateDeliveryAgentDto,
} from "./dto/admin.dto";
import {
  UpdateOrderStatusDto,
  AssignDeliveryAgentDto,
  UpdatePaymentStatusDto,
} from "../orders/dto/order.dto";
import { Throttle } from "@nestjs/throttler";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("admin")
@Roles("admin")
export class AdminController {
  constructor(
    private adminService: AdminService,
    private ordersService: OrdersService,
  ) {}

  @Get("dashboard")
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  getDashboard(@Query("refresh") refresh?: string) {
    return this.adminService.getDashboardStats(refresh === "true");
  }

  @Get("users")
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Patch("users/:id/activate")
  activateUser(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminService.activateUser(id);
  }

  @Patch("users/:id/deactivate")
  deactivateUser(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Delete("users/rejected")
  deleteAllRejectedUsers(@CurrentUser("sub") adminId: string) {
    return this.adminService.deleteAllRejectedCompanyUsers(adminId);
  }

  @Delete("users/:id")
  deleteUser(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.adminService.deleteUser(id, adminId);
  }

  @Get("company-accounts")
  getCompanyAccounts(@Query("status") status?: string) {
    return this.adminService.getCompanyAccounts(status);
  }

  @Patch("company-accounts/:id/approve")
  approveCompany(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminService.approveCompany(id);
  }

  @Patch("company-accounts/:id/reject")
  rejectCompany(@Param("id", ParseUUIDPipe) id: string) {
    return this.adminService.rejectCompany(id);
  }

  @Post("delivery-agents")
  createDeliveryAgent(@Body() dto: CreateDeliveryAgentDto) {
    return this.adminService.createDeliveryAgent(dto);
  }

  @Get("delivery-agents")
  getDeliveryAgents() {
    return this.adminService.getDeliveryAgents();
  }

  @Post("users")
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch("users/:id")
  updateUser(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.adminService.updateUser(id, dto, adminId);
  }

  @Patch("delivery-agents/:id")
  updateDeliveryAgent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryAgentDto,
  ) {
    return this.adminService.updateDeliveryAgent(id, dto);
  }

  @Get("orders")
  getOrders(@Query() query: AdminOrdersQueryDto) {
    return this.ordersService.getAllOrders(query);
  }

  @Get("orders/:id")
  getOrder(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.ordersService.getOrder(adminId, "admin", id);
  }

  @Patch("orders/:id/status")
  updateOrderStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.ordersService.updateStatus(id, dto.status, adminId, dto.note, {
      validateAdmin: true,
    });
  }

  @Patch("orders/:id/payment-status")
  updatePaymentStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.ordersService.updatePaymentStatus(
      id,
      dto.paymentStatus,
      adminId,
    );
  }

  @Patch("orders/:id/assign-delivery-agent")
  assignDeliveryAgent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryAgentDto,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.ordersService.assignDeliveryAgent(
      id,
      dto.deliveryAgentId,
      adminId,
    );
  }

  @Patch("orders/:id/unassign-delivery-agent")
  unassignDeliveryAgent(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("sub") adminId: string,
  ) {
    return this.ordersService.unassignDeliveryAgent(id, adminId);
  }

  @Get("reviews")
  getReviews() {
    return this.adminService.getAllReviews();
  }
}

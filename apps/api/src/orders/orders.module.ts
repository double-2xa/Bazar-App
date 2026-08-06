import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { AddressesModule } from "../addresses/addresses.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AddressesModule, NotificationsModule],
  imports: [NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

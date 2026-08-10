import { Module, forwardRef } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { AddressesModule } from "../addresses/addresses.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WhishModule } from "../whish/whish.module";

@Module({
  imports: [AddressesModule, NotificationsModule, forwardRef(() => WhishModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

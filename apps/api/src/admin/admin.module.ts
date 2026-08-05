import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';
import { AddressesModule } from '../addresses/addresses.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [OrdersModule, AuthModule, AddressesModule, LocationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

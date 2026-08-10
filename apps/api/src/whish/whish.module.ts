import { Module, forwardRef } from '@nestjs/common';
import { WhishService } from './whish.service';
import { WhishController } from './whish.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [WhishController],
  providers: [WhishService],
  exports: [WhishService],
})
export class WhishModule {}

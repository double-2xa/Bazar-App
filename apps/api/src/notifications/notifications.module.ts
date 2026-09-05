import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, WhatsappService],
  controllers: [NotificationsController],
  exports: [NotificationsService, WhatsappService],
})
export class NotificationsModule {}

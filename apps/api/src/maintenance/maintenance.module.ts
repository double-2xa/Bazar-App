import { Module } from '@nestjs/common';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';
import { PushReceiptService } from './push-receipt.service';

@Module({ providers: [RefreshTokenCleanupService, PushReceiptService] })
export class MaintenanceModule {}

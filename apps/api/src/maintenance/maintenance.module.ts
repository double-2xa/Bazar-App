import { Module } from '@nestjs/common';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';

@Module({ providers: [RefreshTokenCleanupService] })
export class MaintenanceModule {}

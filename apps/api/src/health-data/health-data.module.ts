import { Module } from '@nestjs/common';
import { HealthDataSyncController } from './health-data-sync.controller';
import { HealthDataSyncService } from './health-data-sync.service';
import { HealthDataSourceService } from './health-data-source.service';

@Module({
  controllers: [HealthDataSyncController],
  providers: [HealthDataSyncService, HealthDataSourceService],
  exports: [HealthDataSyncService, HealthDataSourceService],
})
export class HealthDataModule {}

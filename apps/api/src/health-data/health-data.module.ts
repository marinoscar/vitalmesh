import { Module } from '@nestjs/common';
import { HealthDataSyncController } from './health-data-sync.controller';
import { HealthDataSyncService } from './health-data-sync.service';
import { HealthDataSourceService } from './health-data-source.service';
import { HealthDataController } from './health-data.controller';
import { HealthDataService } from './health-data.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  controllers: [HealthDataSyncController, HealthDataController, DevicesController],
  providers: [
    HealthDataSyncService,
    HealthDataSourceService,
    HealthDataService,
    DevicesService,
  ],
  exports: [HealthDataSyncService, HealthDataSourceService, HealthDataService],
})
export class HealthDataModule {}

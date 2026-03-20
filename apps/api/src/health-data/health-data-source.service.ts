import { Injectable, Logger } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SyncSourceDto } from './dto/sync-metrics.dto';

@Injectable()
export class HealthDataSourceService {
  private readonly logger = new Logger(HealthDataSourceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a UserDevice record for the given user and source info.
   * Returns the device ID.
   */
  async ensureDevice(source: SyncSourceDto, userId: string): Promise<string> {
    const device = await this.prisma.userDevice.upsert({
      where: {
        userId_deviceName_deviceModel: {
          userId,
          deviceName: source.deviceName,
          deviceModel: source.deviceModel ?? null,
        },
      },
      create: {
        userId,
        deviceName: source.deviceName,
        deviceModel: source.deviceModel,
        deviceManufacturer: source.deviceManufacturer,
        deviceOs: source.deviceOs,
        deviceType: source.deviceType,
        appVersion: source.appVersion,
        lastSyncAt: new Date(),
      },
      update: {
        lastSyncAt: new Date(),
        appVersion: source.appVersion,
        deviceOs: source.deviceOs,
        deviceManufacturer: source.deviceManufacturer,
      },
    });

    this.logger.debug(
      `Device ensured: ${device.id} for user ${userId} (${source.deviceName})`,
    );

    return device.id;
  }

  /**
   * Upsert a HealthDataSource record. Tracks which app/package is sending data.
   */
  async registerSource(
    userId: string,
    deviceId: string,
    dataOrigin: string | undefined,
    sourceType: SourceType,
  ): Promise<void> {
    await this.prisma.healthDataSource.upsert({
      where: {
        userId_sourceType_packageName: {
          userId,
          sourceType,
          packageName: dataOrigin ?? null,
        },
      },
      create: {
        userId,
        deviceId,
        sourceType,
        packageName: dataOrigin,
        lastSeenAt: new Date(),
      },
      update: {
        lastSeenAt: new Date(),
        deviceId,
      },
    });

    this.logger.debug(
      `Data source registered for user ${userId}, type=${sourceType}, origin=${dataOrigin ?? 'unknown'}`,
    );
  }
}

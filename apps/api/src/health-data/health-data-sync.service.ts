import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HealthDataSourceService } from './health-data-source.service';
import { SyncMetricsDto } from './dto/sync-metrics.dto';
import { SyncSleepDto } from './dto/sync-sleep.dto';
import { SyncExerciseDto } from './dto/sync-exercise.dto';
import { SyncNutritionDto } from './dto/sync-nutrition.dto';
import { SyncCycleDto } from './dto/sync-cycle.dto';
import { SyncLabsDto } from './dto/sync-labs.dto';
import { UpdateSyncStateDto } from './dto/sync-state.dto';

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
}

@Injectable()
export class HealthDataSyncService {
  private readonly logger = new Logger(HealthDataSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthDataSourceService: HealthDataSourceService,
  ) {}

  /**
   * Batch upsert health metrics.
   */
  async syncMetrics(dto: SyncMetricsDto, userId: string): Promise<SyncResult> {
    const deviceId = await this.healthDataSourceService.ensureDevice(
      dto.source,
      userId,
    );

    // Collect first dataOrigin seen across items for source registration
    const firstOrigin = dto.metrics.find((m) => m.dataOrigin)?.dataOrigin;
    await this.healthDataSourceService.registerSource(
      userId,
      deviceId,
      firstOrigin,
      SourceType.android_health_connect,
    );

    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.metrics) {
        const mapped = {
          metric: item.metric,
          value: item.value,
          unit: item.unit,
          timestamp: new Date(item.timestamp),
          endTime: item.endTime ? new Date(item.endTime) : null,
          source: item.source ?? null,
          groupId: item.groupId ?? null,
          tags: item.tags
            ? (item.tags as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          zoneOffset: item.zoneOffset ?? null,
          endZoneOffset: item.endZoneOffset ?? null,
          dataOrigin: item.dataOrigin ?? null,
          recordingMethod: item.recordingMethod ?? null,
          deviceType: item.deviceType ?? null,
          metadata: item.metadata
            ? (item.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          notes: item.notes ?? null,
          deviceId,
        };

        if (item.clientRecordId) {
          const existing = await tx.healthMetric.findUnique({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: item.clientRecordId,
              },
            },
            select: { id: true },
          });

          await tx.healthMetric.upsert({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: item.clientRecordId,
              },
            },
            create: {
              ...mapped,
              userId,
              clientRecordId: item.clientRecordId,
            },
            update: {
              ...mapped,
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          });

          if (existing) {
            updated++;
          } else {
            created++;
          }
        } else {
          await tx.healthMetric.create({
            data: { ...mapped, userId },
          });
          created++;
        }
      }
    });

    const synced = created + updated;
    this.logger.log(
      `Metrics synced for user ${userId}: ${synced} total (${created} created, ${updated} updated)`,
    );
    return { synced, created, updated };
  }

  /**
   * Batch upsert sleep sessions (including stages).
   */
  async syncSleep(dto: SyncSleepDto, userId: string): Promise<SyncResult> {
    const deviceId = await this.healthDataSourceService.ensureDevice(
      dto.source,
      userId,
    );

    const firstOrigin = dto.sessions.find((s) => s.dataOrigin)?.dataOrigin;
    await this.healthDataSourceService.registerSource(
      userId,
      deviceId,
      firstOrigin,
      SourceType.android_health_connect,
    );

    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const session of dto.sessions) {
        const mapped = {
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime),
          durationMs: session.durationMs ?? null,
          title: session.title ?? null,
          notes: session.notes ?? null,
          source: session.source ?? null,
          zoneOffset: session.zoneOffset ?? null,
          endZoneOffset: session.endZoneOffset ?? null,
          dataOrigin: session.dataOrigin ?? null,
          recordingMethod: session.recordingMethod ?? null,
          metadata: session.metadata
            ? (session.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          deviceId,
        };

        let sessionId: string;
        let isUpdate = false;

        if (session.clientRecordId) {
          const existing = await tx.healthSleepSession.findUnique({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: session.clientRecordId,
              },
            },
            select: { id: true },
          });

          const upserted = await tx.healthSleepSession.upsert({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: session.clientRecordId,
              },
            },
            create: {
              ...mapped,
              userId,
              clientRecordId: session.clientRecordId,
            },
            update: {
              ...mapped,
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          });

          sessionId = upserted.id;
          isUpdate = !!existing;

          // Delete existing stages when updating so we can re-insert fresh ones
          if (isUpdate) {
            await tx.healthSleepStage.deleteMany({
              where: { sessionId },
            });
          }
        } else {
          const newSession = await tx.healthSleepSession.create({
            data: { ...mapped, userId },
          });
          sessionId = newSession.id;
        }

        // Insert stages
        if (session.stages && session.stages.length > 0) {
          await tx.healthSleepStage.createMany({
            data: session.stages.map((stage) => ({
              sessionId,
              stage: stage.stage,
              startTime: new Date(stage.startTime),
              endTime: new Date(stage.endTime),
            })),
          });
        }

        if (isUpdate) {
          updated++;
        } else {
          created++;
        }
      }
    });

    const synced = created + updated;
    this.logger.log(
      `Sleep sessions synced for user ${userId}: ${synced} total (${created} created, ${updated} updated)`,
    );
    return { synced, created, updated };
  }

  /**
   * Batch upsert exercise sessions.
   */
  async syncExercise(
    dto: SyncExerciseDto,
    userId: string,
  ): Promise<SyncResult> {
    const deviceId = await this.healthDataSourceService.ensureDevice(
      dto.source,
      userId,
    );

    const firstOrigin = dto.sessions.find((s) => s.dataOrigin)?.dataOrigin;
    await this.healthDataSourceService.registerSource(
      userId,
      deviceId,
      firstOrigin,
      SourceType.android_health_connect,
    );

    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const session of dto.sessions) {
        const mapped = {
          exerciseType: session.exerciseType,
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime),
          title: session.title ?? null,
          isPlanned: session.isPlanned ?? false,
          attributes: session.attributes as Prisma.InputJsonValue,
          source: session.source ?? null,
          zoneOffset: session.zoneOffset ?? null,
          endZoneOffset: session.endZoneOffset ?? null,
          dataOrigin: session.dataOrigin ?? null,
          recordingMethod: session.recordingMethod ?? null,
          metadata: session.metadata
            ? (session.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          notes: session.notes ?? null,
          deviceId,
        };

        if (session.clientRecordId) {
          const existing = await tx.healthExerciseSession.findUnique({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: session.clientRecordId,
              },
            },
            select: { id: true },
          });

          await tx.healthExerciseSession.upsert({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: session.clientRecordId,
              },
            },
            create: {
              ...mapped,
              userId,
              clientRecordId: session.clientRecordId,
            },
            update: {
              ...mapped,
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          });

          if (existing) {
            updated++;
          } else {
            created++;
          }
        } else {
          await tx.healthExerciseSession.create({
            data: { ...mapped, userId },
          });
          created++;
        }
      }
    });

    const synced = created + updated;
    this.logger.log(
      `Exercise sessions synced for user ${userId}: ${synced} total (${created} created, ${updated} updated)`,
    );
    return { synced, created, updated };
  }

  /**
   * Batch upsert nutrition entries.
   */
  async syncNutrition(
    dto: SyncNutritionDto,
    userId: string,
  ): Promise<SyncResult> {
    const deviceId = await this.healthDataSourceService.ensureDevice(
      dto.source,
      userId,
    );

    const firstOrigin = dto.entries.find((e) => e.dataOrigin)?.dataOrigin;
    await this.healthDataSourceService.registerSource(
      userId,
      deviceId,
      firstOrigin,
      SourceType.android_health_connect,
    );

    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.entries) {
        const mapped = {
          startTime: new Date(entry.startTime),
          endTime: new Date(entry.endTime),
          mealType: entry.mealType ?? null,
          name: entry.name ?? null,
          nutrients: entry.nutrients as Prisma.InputJsonValue,
          source: entry.source ?? null,
          zoneOffset: entry.zoneOffset ?? null,
          endZoneOffset: entry.endZoneOffset ?? null,
          dataOrigin: entry.dataOrigin ?? null,
          recordingMethod: entry.recordingMethod ?? null,
          metadata: entry.metadata
            ? (entry.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          deviceId,
        };

        if (entry.clientRecordId) {
          const existing = await tx.healthNutrition.findUnique({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: entry.clientRecordId,
              },
            },
            select: { id: true },
          });

          await tx.healthNutrition.upsert({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: entry.clientRecordId,
              },
            },
            create: {
              ...mapped,
              userId,
              clientRecordId: entry.clientRecordId,
            },
            update: {
              ...mapped,
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          });

          if (existing) {
            updated++;
          } else {
            created++;
          }
        } else {
          await tx.healthNutrition.create({
            data: { ...mapped, userId },
          });
          created++;
        }
      }
    });

    const synced = created + updated;
    this.logger.log(
      `Nutrition entries synced for user ${userId}: ${synced} total (${created} created, ${updated} updated)`,
    );
    return { synced, created, updated };
  }

  /**
   * Batch upsert cycle events.
   */
  async syncCycle(dto: SyncCycleDto, userId: string): Promise<SyncResult> {
    const deviceId = await this.healthDataSourceService.ensureDevice(
      dto.source,
      userId,
    );

    const firstOrigin = dto.events.find((e) => e.dataOrigin)?.dataOrigin;
    await this.healthDataSourceService.registerSource(
      userId,
      deviceId,
      firstOrigin,
      SourceType.android_health_connect,
    );

    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const event of dto.events) {
        const mapped = {
          eventType: event.eventType,
          timestamp: new Date(event.timestamp),
          endTime: event.endTime ? new Date(event.endTime) : null,
          data: event.data as Prisma.InputJsonValue,
          source: event.source ?? null,
          zoneOffset: event.zoneOffset ?? null,
          endZoneOffset: event.endZoneOffset ?? null,
          dataOrigin: event.dataOrigin ?? null,
          recordingMethod: event.recordingMethod ?? null,
          metadata: event.metadata
            ? (event.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          deviceId,
        };

        if (event.clientRecordId) {
          const existing = await tx.healthCycleEvent.findUnique({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: event.clientRecordId,
              },
            },
            select: { id: true },
          });

          await tx.healthCycleEvent.upsert({
            where: {
              userId_clientRecordId: {
                userId,
                clientRecordId: event.clientRecordId,
              },
            },
            create: {
              ...mapped,
              userId,
              clientRecordId: event.clientRecordId,
            },
            update: {
              ...mapped,
              version: { increment: 1 },
              updatedAt: new Date(),
            },
          });

          if (existing) {
            updated++;
          } else {
            created++;
          }
        } else {
          await tx.healthCycleEvent.create({
            data: { ...mapped, userId },
          });
          created++;
        }
      }
    });

    const synced = created + updated;
    this.logger.log(
      `Cycle events synced for user ${userId}: ${synced} total (${created} created, ${updated} updated)`,
    );
    return { synced, created, updated };
  }

  /**
   * Batch upsert lab results.
   */
  async syncLabs(dto: SyncLabsDto, userId: string): Promise<SyncResult> {
    const deviceId = await this.healthDataSourceService.ensureDevice(
      dto.source,
      userId,
    );

    await this.healthDataSourceService.registerSource(
      userId,
      deviceId,
      undefined,
      SourceType.lab_upload,
    );

    let created = 0;
    const updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const result of dto.results) {
        await tx.healthLabResult.create({
          data: {
            userId,
            testName: result.testName,
            value: result.value,
            unit: result.unit,
            timestamp: new Date(result.timestamp),
            rangeLow: result.rangeLow ?? null,
            rangeHigh: result.rangeHigh ?? null,
            status: result.status ?? null,
            panelName: result.panelName ?? null,
            labName: result.labName ?? null,
            orderingProvider: result.orderingProvider ?? null,
            notes: result.notes ?? null,
            source: result.source ?? null,
            tags: result.tags
              ? (result.tags as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            deviceId,
          },
        });
        created++;
      }
    });

    const synced = created + updated;
    this.logger.log(
      `Lab results synced for user ${userId}: ${synced} total (${created} created, ${updated} updated)`,
    );
    return { synced, created, updated };
  }

  /**
   * Get sync state for the user, optionally filtered by deviceId.
   */
  async getSyncState(userId: string, deviceId?: string) {
    const where: Record<string, unknown> = { userId };
    if (deviceId) {
      where.deviceId = deviceId;
    }

    const states = await this.prisma.healthSyncState.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return states;
  }

  /**
   * Upsert sync state entries for a device.
   */
  async updateSyncState(dto: UpdateSyncStateDto, userId: string) {
    const results = await this.prisma.$transaction(async (tx) => {
      const upserted = [];

      for (const state of dto.states) {
        const record = await tx.healthSyncState.upsert({
          where: {
            userId_deviceId_dataType: {
              userId,
              deviceId: dto.deviceId,
              dataType: state.dataType,
            },
          },
          create: {
            userId,
            deviceId: dto.deviceId,
            dataType: state.dataType,
            changeToken: state.changeToken ?? null,
            lastSyncAt: state.lastSyncAt ? new Date(state.lastSyncAt) : null,
            lastRecordTime: state.lastRecordTime
              ? new Date(state.lastRecordTime)
              : null,
            recordsSynced: state.recordsSynced ?? 0,
            syncStatus: state.syncStatus ?? 'idle',
            errorMessage: state.errorMessage ?? null,
          },
          update: {
            changeToken: state.changeToken ?? null,
            lastSyncAt: state.lastSyncAt ? new Date(state.lastSyncAt) : null,
            lastRecordTime: state.lastRecordTime
              ? new Date(state.lastRecordTime)
              : null,
            recordsSynced: state.recordsSynced ?? 0,
            syncStatus: state.syncStatus ?? 'idle',
            errorMessage: state.errorMessage ?? null,
          },
        });
        upserted.push(record);
      }

      return upserted;
    });

    this.logger.log(
      `Sync state updated for user ${userId}, device ${dto.deviceId}: ${results.length} states`,
    );

    return results;
  }
}

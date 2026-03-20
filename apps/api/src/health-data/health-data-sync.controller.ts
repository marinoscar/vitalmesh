import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/roles.constants';
import { HealthDataSyncService } from './health-data-sync.service';

import {
  SyncMetricsDto,
  syncMetricsSchema,
} from './dto/sync-metrics.dto';
import { SyncSleepDto, syncSleepSchema } from './dto/sync-sleep.dto';
import {
  SyncExerciseDto,
  syncExerciseSchema,
} from './dto/sync-exercise.dto';
import {
  SyncNutritionDto,
  syncNutritionSchema,
} from './dto/sync-nutrition.dto';
import { SyncCycleDto, syncCycleSchema } from './dto/sync-cycle.dto';
import { SyncLabsDto, syncLabsSchema } from './dto/sync-labs.dto';
import {
  UpdateSyncStateDto,
  GetSyncStateQueryDto,
  updateSyncStateSchema,
  getSyncStateQuerySchema,
} from './dto/sync-state.dto';

@ApiTags('Health Data Sync')
@Controller('health-data')
export class HealthDataSyncController {
  constructor(private readonly syncService: HealthDataSyncService) {}

  /**
   * Batch upsert health metrics (up to 500 per request).
   */
  @Post('metrics')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({
    summary: 'Sync health metrics',
    description: 'Batch upsert health metrics from a device. Supports deduplication via clientRecordId.',
  })
  @ApiResponse({
    status: 201,
    description: 'Metrics synced successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            synced: { type: 'number' },
            created: { type: 'number' },
            updated: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async syncMetrics(
    @Body(new ZodValidationPipe(syncMetricsSchema)) dto: SyncMetricsDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.syncMetrics(dto, userId);
    return { data: result };
  }

  /**
   * Batch upsert sleep sessions with stages (up to 100 per request).
   */
  @Post('sleep')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({
    summary: 'Sync sleep sessions',
    description: 'Batch upsert sleep sessions and their stages. Stages are replaced on update.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sleep sessions synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async syncSleep(
    @Body(new ZodValidationPipe(syncSleepSchema)) dto: SyncSleepDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.syncSleep(dto, userId);
    return { data: result };
  }

  /**
   * Batch upsert exercise sessions (up to 100 per request).
   */
  @Post('exercise')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({
    summary: 'Sync exercise sessions',
    description: 'Batch upsert exercise sessions from a device.',
  })
  @ApiResponse({
    status: 201,
    description: 'Exercise sessions synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async syncExercise(
    @Body(new ZodValidationPipe(syncExerciseSchema)) dto: SyncExerciseDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.syncExercise(dto, userId);
    return { data: result };
  }

  /**
   * Batch upsert nutrition entries (up to 100 per request).
   */
  @Post('nutrition')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({
    summary: 'Sync nutrition entries',
    description: 'Batch upsert nutrition/meal entries from a device.',
  })
  @ApiResponse({
    status: 201,
    description: 'Nutrition entries synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async syncNutrition(
    @Body(new ZodValidationPipe(syncNutritionSchema)) dto: SyncNutritionDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.syncNutrition(dto, userId);
    return { data: result };
  }

  /**
   * Batch upsert cycle tracking events (up to 100 per request).
   */
  @Post('cycle')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({
    summary: 'Sync cycle events',
    description: 'Batch upsert menstrual cycle and reproductive health events.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cycle events synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async syncCycle(
    @Body(new ZodValidationPipe(syncCycleSchema)) dto: SyncCycleDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.syncCycle(dto, userId);
    return { data: result };
  }

  /**
   * Batch upsert lab results (up to 100 per request).
   */
  @Post('labs')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({
    summary: 'Sync lab results',
    description: 'Batch insert lab test results for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Lab results synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async syncLabs(
    @Body(new ZodValidationPipe(syncLabsSchema)) dto: SyncLabsDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.syncLabs(dto, userId);
    return { data: result };
  }

  /**
   * Get sync state for the authenticated user, optionally filtered by deviceId.
   */
  @Get('sync/state')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({
    summary: 'Get sync state',
    description: 'Retrieve the current sync state per data type, optionally filtered by device.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync state retrieved successfully',
  })
  async getSyncState(
    @Query(new ZodValidationPipe(getSyncStateQuerySchema))
    query: GetSyncStateQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.getSyncState(
      userId,
      query.deviceId,
    );
    return { data: result };
  }

  /**
   * Update sync state for one or more data types on a device.
   */
  @Put('sync/state')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({
    summary: 'Update sync state',
    description: 'Upsert sync state entries for data types on a specific device.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync state updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateSyncState(
    @Body(new ZodValidationPipe(updateSyncStateSchema))
    dto: UpdateSyncStateDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.syncService.updateSyncState(dto, userId);
    return { data: result };
  }
}

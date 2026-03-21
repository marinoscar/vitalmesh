import { Test, TestingModule } from '@nestjs/testing';
import { SourceType } from '@prisma/client';
import { HealthDataSyncService } from './health-data-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthDataSourceService } from './health-data-source.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/mocks/prisma.mock';
import { SyncMetricsDto } from './dto/sync-metrics.dto';
import { SyncSleepDto } from './dto/sync-sleep.dto';
import { SyncExerciseDto } from './dto/sync-exercise.dto';
import { SyncNutritionDto } from './dto/sync-nutrition.dto';
import { SyncCycleDto } from './dto/sync-cycle.dto';
import { SyncLabsDto } from './dto/sync-labs.dto';
import { UpdateSyncStateDto } from './dto/sync-state.dto';

describe('HealthDataSyncService', () => {
  let service: HealthDataSyncService;
  let mockPrisma: MockPrismaService;
  let mockSourceService: jest.Mocked<HealthDataSourceService>;

  const userId = 'user-123';
  const deviceId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const mockSource = {
    deviceName: 'Pixel 8',
    deviceModel: 'Pixel 8',
    deviceManufacturer: 'Google',
    deviceOs: 'Android 14',
    deviceType: 'phone',
    appVersion: '1.0.0',
  };

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();

    mockSourceService = {
      ensureDevice: jest.fn().mockResolvedValue(deviceId),
      registerSource: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Default $transaction implementation passes a proxy of the mock through
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthDataSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HealthDataSourceService, useValue: mockSourceService },
      ],
    }).compile();

    service = module.get<HealthDataSyncService>(HealthDataSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // syncMetrics
  // ============================================================

  describe('syncMetrics', () => {
    const baseDto = {
      source: mockSource,
      metrics: [] as SyncMetricsDto['metrics'],
    };

    it('should call ensureDevice and registerSource', async () => {
      await service.syncMetrics(baseDto as SyncMetricsDto, userId);

      expect(mockSourceService.ensureDevice).toHaveBeenCalledWith(
        mockSource,
        userId,
      );
      expect(mockSourceService.registerSource).toHaveBeenCalledWith(
        userId,
        deviceId,
        undefined,
        SourceType.android_health_connect,
      );
    });

    it('should create new metric when no clientRecordId provided', async () => {
      const dto: SyncMetricsDto = {
        source: mockSource,
        metrics: [
          {
            metric: 'steps',
            value: 1000,
            unit: 'count',
            timestamp: '2024-01-15T10:00:00Z',
          },
        ],
      };

      mockPrisma.healthMetric.create.mockResolvedValue({ id: 'metric-1' } as any);

      const result = await service.syncMetrics(dto, userId);

      expect(mockPrisma.healthMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metric: 'steps',
          value: 1000,
          unit: 'count',
          userId,
          deviceId,
        }),
      });
      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });

    it('should create new metric via upsert when clientRecordId not found', async () => {
      const dto: SyncMetricsDto = {
        source: mockSource,
        metrics: [
          {
            metric: 'steps',
            value: 500,
            unit: 'count',
            timestamp: '2024-01-15T11:00:00Z',
            clientRecordId: 'client-rec-1',
          },
        ],
      };

      mockPrisma.healthMetric.findUnique.mockResolvedValue(null);
      mockPrisma.healthMetric.upsert.mockResolvedValue({ id: 'metric-1' } as any);

      const result = await service.syncMetrics(dto, userId);

      expect(mockPrisma.healthMetric.findUnique).toHaveBeenCalledWith({
        where: {
          userId_clientRecordId: { userId, clientRecordId: 'client-rec-1' },
        },
        select: { id: true },
      });
      expect(mockPrisma.healthMetric.upsert).toHaveBeenCalled();
      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });

    it('should update existing metric when clientRecordId exists', async () => {
      const dto: SyncMetricsDto = {
        source: mockSource,
        metrics: [
          {
            metric: 'steps',
            value: 1500,
            unit: 'count',
            timestamp: '2024-01-15T12:00:00Z',
            clientRecordId: 'client-rec-1',
          },
        ],
      };

      mockPrisma.healthMetric.findUnique.mockResolvedValue({ id: 'existing-metric' } as any);
      mockPrisma.healthMetric.upsert.mockResolvedValue({ id: 'existing-metric' } as any);

      const result = await service.syncMetrics(dto, userId);

      expect(mockPrisma.healthMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            version: { increment: 1 },
          }),
        }),
      );
      expect(result).toEqual({ synced: 1, created: 0, updated: 1 });
    });

    it('should return correct counts for mixed create and update', async () => {
      const dto: SyncMetricsDto = {
        source: mockSource,
        metrics: [
          {
            metric: 'steps',
            value: 1000,
            unit: 'count',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            metric: 'heart_rate',
            value: 70,
            unit: 'bpm',
            timestamp: '2024-01-15T10:01:00Z',
            clientRecordId: 'hr-1',
          },
          {
            metric: 'heart_rate',
            value: 72,
            unit: 'bpm',
            timestamp: '2024-01-15T10:02:00Z',
            clientRecordId: 'hr-2',
          },
        ],
      };

      mockPrisma.healthMetric.create.mockResolvedValue({ id: 'm1' } as any);
      mockPrisma.healthMetric.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-hr' } as any);
      mockPrisma.healthMetric.upsert.mockResolvedValue({ id: 'hr' } as any);

      const result = await service.syncMetrics(dto, userId);

      expect(result).toEqual({ synced: 3, created: 2, updated: 1 });
    });

    it('should use first dataOrigin found for registerSource', async () => {
      const dto: SyncMetricsDto = {
        source: mockSource,
        metrics: [
          {
            metric: 'steps',
            value: 1000,
            unit: 'count',
            timestamp: '2024-01-15T10:00:00Z',
            dataOrigin: 'com.google.fit',
          },
        ],
      };

      mockPrisma.healthMetric.create.mockResolvedValue({ id: 'm1' } as any);

      await service.syncMetrics(dto, userId);

      expect(mockSourceService.registerSource).toHaveBeenCalledWith(
        userId,
        deviceId,
        'com.google.fit',
        SourceType.android_health_connect,
      );
    });
  });

  // ============================================================
  // syncSleep
  // ============================================================

  describe('syncSleep', () => {
    it('should create sleep session with stages', async () => {
      const dto: SyncSleepDto = {
        source: mockSource,
        sessions: [
          {
            startTime: '2024-01-15T22:00:00Z',
            endTime: '2024-01-16T06:00:00Z',
            stages: [
              {
                stage: 'deep',
                startTime: '2024-01-15T23:00:00Z',
                endTime: '2024-01-16T01:00:00Z',
              },
            ],
          },
        ],
      };

      const createdSession = { id: 'sleep-session-1' };
      mockPrisma.healthSleepSession.create.mockResolvedValue(createdSession as any);
      mockPrisma.healthSleepStage.createMany.mockResolvedValue({ count: 1 });

      const result = await service.syncSleep(dto, userId);

      expect(mockPrisma.healthSleepSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, deviceId }),
      });
      expect(mockPrisma.healthSleepStage.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            sessionId: 'sleep-session-1',
            stage: 'deep',
          }),
        ],
      });
      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });

    it('should not create stages when stages array is empty', async () => {
      const dto: SyncSleepDto = {
        source: mockSource,
        sessions: [
          {
            startTime: '2024-01-15T22:00:00Z',
            endTime: '2024-01-16T06:00:00Z',
            stages: [],
          },
        ],
      };

      mockPrisma.healthSleepSession.create.mockResolvedValue({ id: 'sleep-1' } as any);

      await service.syncSleep(dto, userId);

      expect(mockPrisma.healthSleepStage.createMany).not.toHaveBeenCalled();
    });

    it('should update sleep session and replace stages on conflict', async () => {
      const dto: SyncSleepDto = {
        source: mockSource,
        sessions: [
          {
            startTime: '2024-01-15T22:00:00Z',
            endTime: '2024-01-16T06:00:00Z',
            clientRecordId: 'sleep-client-1',
            stages: [
              {
                stage: 'rem',
                startTime: '2024-01-16T03:00:00Z',
                endTime: '2024-01-16T04:00:00Z',
              },
            ],
          },
        ],
      };

      const existingSession = { id: 'sleep-session-existing' };
      mockPrisma.healthSleepSession.findUnique.mockResolvedValue(existingSession as any);
      mockPrisma.healthSleepSession.upsert.mockResolvedValue(existingSession as any);
      mockPrisma.healthSleepStage.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.healthSleepStage.createMany.mockResolvedValue({ count: 1 });

      const result = await service.syncSleep(dto, userId);

      expect(mockPrisma.healthSleepStage.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: 'sleep-session-existing' },
      });
      expect(mockPrisma.healthSleepStage.createMany).toHaveBeenCalled();
      expect(result).toEqual({ synced: 1, created: 0, updated: 1 });
    });

    it('should not delete stages when creating new session with clientRecordId', async () => {
      const dto: SyncSleepDto = {
        source: mockSource,
        sessions: [
          {
            startTime: '2024-01-15T22:00:00Z',
            endTime: '2024-01-16T06:00:00Z',
            clientRecordId: 'new-sleep-client',
            stages: [],
          },
        ],
      };

      mockPrisma.healthSleepSession.findUnique.mockResolvedValue(null);
      mockPrisma.healthSleepSession.upsert.mockResolvedValue({ id: 'new-sleep' } as any);

      await service.syncSleep(dto, userId);

      expect(mockPrisma.healthSleepStage.deleteMany).not.toHaveBeenCalled();
    });

    it('should return correct counts for batch of sessions', async () => {
      const dto: SyncSleepDto = {
        source: mockSource,
        sessions: [
          {
            startTime: '2024-01-14T22:00:00Z',
            endTime: '2024-01-15T06:00:00Z',
            stages: [],
          },
          {
            startTime: '2024-01-15T22:00:00Z',
            endTime: '2024-01-16T06:00:00Z',
            clientRecordId: 'sleep-to-update',
            stages: [],
          },
        ],
      };

      mockPrisma.healthSleepSession.create.mockResolvedValue({ id: 'new-sleep' } as any);
      mockPrisma.healthSleepSession.findUnique.mockResolvedValue({ id: 'existing-sleep' } as any);
      mockPrisma.healthSleepSession.upsert.mockResolvedValue({ id: 'existing-sleep' } as any);
      mockPrisma.healthSleepStage.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.syncSleep(dto, userId);

      expect(result).toEqual({ synced: 2, created: 1, updated: 1 });
    });
  });

  // ============================================================
  // syncExercise
  // ============================================================

  describe('syncExercise', () => {
    it('should create exercise session without clientRecordId', async () => {
      const dto: SyncExerciseDto = {
        source: mockSource,
        sessions: [
          {
            exerciseType: 'running',
            startTime: '2024-01-15T07:00:00Z',
            endTime: '2024-01-15T08:00:00Z',
            attributes: {},
          },
        ],
      };

      mockPrisma.healthExerciseSession.create.mockResolvedValue({ id: 'ex-1' } as any);

      const result = await service.syncExercise(dto, userId);

      expect(mockPrisma.healthExerciseSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, deviceId, exerciseType: 'running' }),
      });
      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });

    it('should upsert exercise session on clientRecordId conflict (update)', async () => {
      const dto: SyncExerciseDto = {
        source: mockSource,
        sessions: [
          {
            exerciseType: 'cycling',
            startTime: '2024-01-15T09:00:00Z',
            endTime: '2024-01-15T10:00:00Z',
            attributes: {},
            clientRecordId: 'ex-client-1',
          },
        ],
      };

      mockPrisma.healthExerciseSession.findUnique.mockResolvedValue({ id: 'ex-existing' } as any);
      mockPrisma.healthExerciseSession.upsert.mockResolvedValue({ id: 'ex-existing' } as any);

      const result = await service.syncExercise(dto, userId);

      expect(mockPrisma.healthExerciseSession.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_clientRecordId: { userId, clientRecordId: 'ex-client-1' },
          },
          update: expect.objectContaining({ version: { increment: 1 } }),
        }),
      );
      expect(result).toEqual({ synced: 1, created: 0, updated: 1 });
    });

    it('should create via upsert when clientRecordId not found', async () => {
      const dto: SyncExerciseDto = {
        source: mockSource,
        sessions: [
          {
            exerciseType: 'swimming',
            startTime: '2024-01-15T11:00:00Z',
            endTime: '2024-01-15T12:00:00Z',
            attributes: {},
            clientRecordId: 'new-ex-client',
          },
        ],
      };

      mockPrisma.healthExerciseSession.findUnique.mockResolvedValue(null);
      mockPrisma.healthExerciseSession.upsert.mockResolvedValue({ id: 'new-ex' } as any);

      const result = await service.syncExercise(dto, userId);

      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });
  });

  // ============================================================
  // syncNutrition
  // ============================================================

  describe('syncNutrition', () => {
    it('should create nutrition entry without clientRecordId', async () => {
      const dto: SyncNutritionDto = {
        source: mockSource,
        entries: [
          {
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T08:30:00Z',
            name: 'Oatmeal',
            nutrients: { calories: 300 },
          },
        ],
      };

      mockPrisma.healthNutrition.create.mockResolvedValue({ id: 'nutr-1' } as any);

      const result = await service.syncNutrition(dto, userId);

      expect(mockPrisma.healthNutrition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, deviceId, name: 'Oatmeal' }),
      });
      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });

    it('should upsert nutrition entry on clientRecordId conflict (update)', async () => {
      const dto: SyncNutritionDto = {
        source: mockSource,
        entries: [
          {
            startTime: '2024-01-15T12:00:00Z',
            endTime: '2024-01-15T12:30:00Z',
            name: 'Salad',
            clientRecordId: 'nutr-client-1',
            nutrients: { calories: 150 },
          },
        ],
      };

      mockPrisma.healthNutrition.findUnique.mockResolvedValue({ id: 'nutr-existing' } as any);
      mockPrisma.healthNutrition.upsert.mockResolvedValue({ id: 'nutr-existing' } as any);

      const result = await service.syncNutrition(dto, userId);

      expect(result).toEqual({ synced: 1, created: 0, updated: 1 });
    });

    it('should create via upsert when clientRecordId not found', async () => {
      const dto: SyncNutritionDto = {
        source: mockSource,
        entries: [
          {
            startTime: '2024-01-15T18:00:00Z',
            endTime: '2024-01-15T18:45:00Z',
            name: 'Dinner',
            clientRecordId: 'new-nutr-client',
            nutrients: { calories: 600 },
          },
        ],
      };

      mockPrisma.healthNutrition.findUnique.mockResolvedValue(null);
      mockPrisma.healthNutrition.upsert.mockResolvedValue({ id: 'new-nutr' } as any);

      const result = await service.syncNutrition(dto, userId);

      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });
  });

  // ============================================================
  // syncCycle
  // ============================================================

  describe('syncCycle', () => {
    it('should create cycle event without clientRecordId', async () => {
      const dto: SyncCycleDto = {
        source: mockSource,
        events: [
          {
            eventType: 'menstruation_flow',
            timestamp: '2024-01-15T00:00:00Z',
            data: {},
          },
        ],
      };

      mockPrisma.healthCycleEvent.create.mockResolvedValue({ id: 'cycle-1' } as any);

      const result = await service.syncCycle(dto, userId);

      expect(mockPrisma.healthCycleEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, deviceId, eventType: 'menstruation_flow' }),
      });
      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });

    it('should upsert cycle event on clientRecordId conflict (update)', async () => {
      const dto: SyncCycleDto = {
        source: mockSource,
        events: [
          {
            eventType: 'ovulation_test',
            timestamp: '2024-01-15T00:00:00Z',
            clientRecordId: 'cycle-client-1',
            data: {},
          },
        ],
      };

      mockPrisma.healthCycleEvent.findUnique.mockResolvedValue({ id: 'cycle-existing' } as any);
      mockPrisma.healthCycleEvent.upsert.mockResolvedValue({ id: 'cycle-existing' } as any);

      const result = await service.syncCycle(dto, userId);

      expect(result).toEqual({ synced: 1, created: 0, updated: 1 });
    });

    it('should create via upsert when clientRecordId not found', async () => {
      const dto: SyncCycleDto = {
        source: mockSource,
        events: [
          {
            eventType: 'intermenstrual_bleeding',
            timestamp: '2024-01-15T00:00:00Z',
            clientRecordId: 'new-cycle-client',
            data: {},
          },
        ],
      };

      mockPrisma.healthCycleEvent.findUnique.mockResolvedValue(null);
      mockPrisma.healthCycleEvent.upsert.mockResolvedValue({ id: 'new-cycle' } as any);

      const result = await service.syncCycle(dto, userId);

      expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    });
  });

  // ============================================================
  // syncLabs
  // ============================================================

  describe('syncLabs', () => {
    it('should create lab results without deduplication', async () => {
      const dto: SyncLabsDto = {
        source: mockSource,
        results: [
          {
            testName: 'Glucose',
            value: 95,
            unit: 'mg/dL',
            timestamp: '2024-01-15T09:00:00Z',
          },
          {
            testName: 'HbA1c',
            value: 5.4,
            unit: '%',
            timestamp: '2024-01-15T09:00:00Z',
          },
        ],
      };

      mockPrisma.healthLabResult.create
        .mockResolvedValueOnce({ id: 'lab-1' } as any)
        .mockResolvedValueOnce({ id: 'lab-2' } as any);

      const result = await service.syncLabs(dto, userId);

      expect(mockPrisma.healthLabResult.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ synced: 2, created: 2, updated: 0 });
    });

    it('should register source as lab_upload type', async () => {
      const dto: SyncLabsDto = {
        source: mockSource,
        results: [
          {
            testName: 'Cholesterol',
            value: 180,
            unit: 'mg/dL',
            timestamp: '2024-01-15T09:00:00Z',
          },
        ],
      };

      mockPrisma.healthLabResult.create.mockResolvedValue({ id: 'lab-1' } as any);

      await service.syncLabs(dto, userId);

      expect(mockSourceService.registerSource).toHaveBeenCalledWith(
        userId,
        deviceId,
        undefined,
        SourceType.lab_upload,
      );
    });

    it('should include all lab fields when creating', async () => {
      const dto: SyncLabsDto = {
        source: mockSource,
        results: [
          {
            testName: 'TSH',
            value: 2.1,
            unit: 'mIU/L',
            timestamp: '2024-01-15T09:00:00Z',
            rangeLow: 0.4,
            rangeHigh: 4.0,
            status: 'normal',
            panelName: 'Thyroid Panel',
            labName: 'LabCorp',
            orderingProvider: 'Dr. Smith',
            notes: 'Fasting required',
            tags: { panel: 'thyroid' },
          },
        ],
      };

      mockPrisma.healthLabResult.create.mockResolvedValue({ id: 'lab-tsh' } as any);

      await service.syncLabs(dto, userId);

      expect(mockPrisma.healthLabResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          testName: 'TSH',
          rangeLow: 0.4,
          rangeHigh: 4.0,
          status: 'normal',
          panelName: 'Thyroid Panel',
          labName: 'LabCorp',
          tags: { panel: 'thyroid' },
        }),
      });
    });

    it('should return zero updated count (labs have no dedup)', async () => {
      const dto: SyncLabsDto = {
        source: mockSource,
        results: [
          {
            testName: 'WBC',
            value: 7.5,
            unit: 'K/uL',
            timestamp: '2024-01-15T09:00:00Z',
          },
        ],
      };

      mockPrisma.healthLabResult.create.mockResolvedValue({ id: 'lab-wbc' } as any);

      const result = await service.syncLabs(dto, userId);

      expect(result.updated).toBe(0);
    });
  });

  // ============================================================
  // getSyncState
  // ============================================================

  describe('getSyncState', () => {
    it('should query sync state by userId only when no deviceId given', async () => {
      const mockStates = [
        { id: 'state-1', userId, dataType: 'steps', deviceId: 'dev-1' },
      ];
      mockPrisma.healthSyncState.findMany.mockResolvedValue(mockStates as any);

      const result = await service.getSyncState(userId);

      expect(mockPrisma.healthSyncState.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(mockStates);
    });

    it('should filter by deviceId when provided', async () => {
      const mockStates = [
        { id: 'state-1', userId, dataType: 'steps', deviceId },
      ];
      mockPrisma.healthSyncState.findMany.mockResolvedValue(mockStates as any);

      const result = await service.getSyncState(userId, deviceId);

      expect(mockPrisma.healthSyncState.findMany).toHaveBeenCalledWith({
        where: { userId, deviceId },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(mockStates);
    });

    it('should return empty array when no states found', async () => {
      mockPrisma.healthSyncState.findMany.mockResolvedValue([]);

      const result = await service.getSyncState(userId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // updateSyncState
  // ============================================================

  describe('updateSyncState', () => {
    it('should upsert sync state entries for each dataType', async () => {
      const dto: UpdateSyncStateDto = {
        deviceId,
        states: [
          {
            dataType: 'steps',
            changeToken: 'token-abc',
            lastSyncAt: '2024-01-15T10:00:00Z',
            recordsSynced: 150,
            syncStatus: 'idle',
          },
          {
            dataType: 'sleep',
            changeToken: 'token-def',
            lastSyncAt: '2024-01-15T10:00:00Z',
            recordsSynced: 7,
            syncStatus: 'idle',
          },
        ],
      };

      const upsertedRecords = [
        { id: 'sync-state-1', dataType: 'steps' },
        { id: 'sync-state-2', dataType: 'sleep' },
      ];
      mockPrisma.healthSyncState.upsert
        .mockResolvedValueOnce(upsertedRecords[0] as any)
        .mockResolvedValueOnce(upsertedRecords[1] as any);

      const result = await service.updateSyncState(dto, userId);

      expect(mockPrisma.healthSyncState.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.healthSyncState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_deviceId_dataType: { userId, deviceId, dataType: 'steps' },
          },
          create: expect.objectContaining({
            userId,
            deviceId,
            dataType: 'steps',
            changeToken: 'token-abc',
            recordsSynced: 150,
            syncStatus: 'idle',
          }),
          update: expect.objectContaining({
            changeToken: 'token-abc',
            recordsSynced: 150,
            syncStatus: 'idle',
          }),
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('should use null defaults for optional fields', async () => {
      const dto: UpdateSyncStateDto = {
        deviceId,
        states: [
          {
            dataType: 'exercise',
          },
        ],
      };

      mockPrisma.healthSyncState.upsert.mockResolvedValue({ id: 'sync-ex' } as any);

      await service.updateSyncState(dto, userId);

      expect(mockPrisma.healthSyncState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            changeToken: null,
            lastSyncAt: null,
            lastRecordTime: null,
            recordsSynced: 0,
            syncStatus: 'idle',
            errorMessage: null,
          }),
        }),
      );
    });

    it('should return all upserted state records', async () => {
      const dto: UpdateSyncStateDto = {
        deviceId,
        states: [{ dataType: 'labs' }],
      };

      const stateRecord = { id: 'sync-labs', dataType: 'labs' };
      mockPrisma.healthSyncState.upsert.mockResolvedValue(stateRecord as any);

      const result = await service.updateSyncState(dto, userId);

      expect(result).toEqual([stateRecord]);
    });
  });
});

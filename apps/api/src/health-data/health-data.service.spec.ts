import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HealthDataService } from './health-data.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/mocks/prisma.mock';
import {
  MetricsQueryDto,
  SummaryQueryDto,
  DeleteMetricsDto,
} from './dto/health-query.dto';
import { HealthTableName, UpdateRecordDto } from './dto/update-record.dto';
import { CreateMoodScaleDto, UpdateMoodScaleDto } from './dto/mood-scale.dto';
import { CreateSessionDto, SessionRecordsDto } from './dto/session.dto';
import { CreateAttachmentDto } from './dto/attachment.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

describe('HealthDataService', () => {
  let service: HealthDataService;
  let mockPrisma: MockPrismaService;

  const userId = 'user-abc';
  const recordId = 'record-xyz';

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthDataService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HealthDataService>(HealthDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // queryMetrics
  // ============================================================

  describe('queryMetrics', () => {
    const baseQuery: MetricsQueryDto = {
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    };

    it('should return paginated results', async () => {
      const items = [
        { id: 'm1', metric: 'steps', value: 1000 },
        { id: 'm2', metric: 'steps', value: 800 },
      ];
      mockPrisma.healthMetric.findMany.mockResolvedValue(items as any);
      mockPrisma.healthMetric.count.mockResolvedValue(2);

      const result = await service.queryMetrics(baseQuery, userId);

      expect(result.items).toEqual(items);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      });
    });

    it('should filter by metric name', async () => {
      const query: MetricsQueryDto = { ...baseQuery, metric: 'heart_rate' };

      mockPrisma.healthMetric.findMany.mockResolvedValue([]);
      mockPrisma.healthMetric.count.mockResolvedValue(0);

      await service.queryMetrics(query, userId);

      expect(mockPrisma.healthMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId, metric: 'heart_rate' }),
        }),
      );
    });

    it('should filter by time range when from and to are provided', async () => {
      const query: MetricsQueryDto = {
        ...baseQuery,
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
      };

      mockPrisma.healthMetric.findMany.mockResolvedValue([]);
      mockPrisma.healthMetric.count.mockResolvedValue(0);

      await service.queryMetrics(query, userId);

      expect(mockPrisma.healthMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: new Date('2024-01-01T00:00:00Z'),
              lte: new Date('2024-01-31T23:59:59Z'),
            },
          }),
        }),
      );
    });

    it('should apply sort order', async () => {
      const query: MetricsQueryDto = { ...baseQuery, sortOrder: 'asc' };

      mockPrisma.healthMetric.findMany.mockResolvedValue([]);
      mockPrisma.healthMetric.count.mockResolvedValue(0);

      await service.queryMetrics(query, userId);

      expect(mockPrisma.healthMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'asc' },
        }),
      );
    });

    it('should apply correct pagination skip and take', async () => {
      const query: MetricsQueryDto = { ...baseQuery, page: 3, pageSize: 10 };

      mockPrisma.healthMetric.findMany.mockResolvedValue([]);
      mockPrisma.healthMetric.count.mockResolvedValue(30);

      await service.queryMetrics(query, userId);

      expect(mockPrisma.healthMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.healthMetric.findMany.mockResolvedValue([]);
      mockPrisma.healthMetric.count.mockResolvedValue(47);

      const result = await service.queryMetrics(
        { ...baseQuery, pageSize: 10 },
        userId,
      );

      expect(result.meta.totalPages).toBe(5);
    });
  });

  // ============================================================
  // getSummary
  // ============================================================

  describe('getSummary', () => {
    const emptyAggregate = {
      _sum: { value: null },
      _avg: { value: null },
      _min: { value: null },
      _max: { value: null },
    };

    const setupEmptySummaryMocks = () => {
      mockPrisma.healthMetric.aggregate.mockResolvedValue(emptyAggregate as any);
      mockPrisma.healthSleepSession.findMany.mockResolvedValue([]);
      mockPrisma.healthMetric.findFirst.mockResolvedValue(null);
      mockPrisma.healthExerciseSession.findMany.mockResolvedValue([]);
    };

    it('should handle empty data gracefully and return zeros/nulls', async () => {
      setupEmptySummaryMocks();

      const query: SummaryQueryDto = { range: 'day', date: '2024-01-15' };
      const result = await service.getSummary(query, userId);

      expect(result.steps.total).toBe(0);
      expect(result.steps.average).toBe(0);
      expect(result.steps.latest).toBeNull();
      expect(result.heartRate.min).toBeNull();
      expect(result.heartRate.max).toBeNull();
      expect(result.heartRate.resting).toBeNull();
      expect(result.sleep.totalDurationMs).toBe(0);
      expect(result.sleep.stages).toEqual({ deep: 0, light: 0, rem: 0, awake: 0 });
      expect(result.weight.latest).toBeNull();
      expect(result.bloodPressure.latest).toBeNull();
      expect(result.activeCalories.total).toBe(0);
      expect(result.exercise.sessions).toBe(0);
      expect(result.exercise.totalDurationMs).toBe(0);
    });

    it('should aggregate daily step data correctly', async () => {
      setupEmptySummaryMocks();
      mockPrisma.healthMetric.aggregate
        .mockResolvedValueOnce({ _sum: { value: 8500 }, _avg: { value: 8500 } } as any)
        .mockResolvedValue(emptyAggregate as any);

      const query: SummaryQueryDto = { range: 'day', date: '2024-01-15' };
      const result = await service.getSummary(query, userId);

      expect(result.steps.total).toBe(8500);
      expect(result.steps.average).toBe(8500);
    });

    it('should calculate sleep stage durations from stages', async () => {
      setupEmptySummaryMocks();

      const sleepStart = new Date('2024-01-15T22:00:00Z');
      const sleepEnd = new Date('2024-01-16T06:00:00Z');
      const deepStart = new Date('2024-01-15T23:00:00Z');
      const deepEnd = new Date('2024-01-16T01:00:00Z');

      mockPrisma.healthSleepSession.findMany.mockResolvedValue([
        {
          id: 'sleep-1',
          startTime: sleepStart,
          endTime: sleepEnd,
          durationMs: null,
          stages: [
            { stage: 'deep', startTime: deepStart, endTime: deepEnd },
          ],
        },
      ] as any);

      const query: SummaryQueryDto = { range: 'day', date: '2024-01-15' };
      const result = await service.getSummary(query, userId);

      const expectedTotalMs = sleepEnd.getTime() - sleepStart.getTime();
      const expectedDeepMs = deepEnd.getTime() - deepStart.getTime();

      expect(result.sleep.totalDurationMs).toBe(expectedTotalMs);
      expect(result.sleep.stages.deep).toBe(expectedDeepMs);
      expect(result.sleep.stages.rem).toBe(0);
    });

    it('should use durationMs when available instead of calculating from times', async () => {
      setupEmptySummaryMocks();

      mockPrisma.healthSleepSession.findMany.mockResolvedValue([
        {
          id: 'sleep-1',
          startTime: new Date('2024-01-15T22:00:00Z'),
          endTime: new Date('2024-01-16T06:00:00Z'),
          durationMs: BigInt(25200000), // 7 hours
          stages: [],
        },
      ] as any);

      const query: SummaryQueryDto = { range: 'day', date: '2024-01-15' };
      const result = await service.getSummary(query, userId);

      expect(result.sleep.totalDurationMs).toBe(25200000);
    });

    it('should calculate exercise total duration', async () => {
      setupEmptySummaryMocks();

      const exStart = new Date('2024-01-15T07:00:00Z');
      const exEnd = new Date('2024-01-15T08:00:00Z');
      mockPrisma.healthExerciseSession.findMany.mockResolvedValue([
        { startTime: exStart, endTime: exEnd },
      ] as any);

      const query: SummaryQueryDto = { range: 'day', date: '2024-01-15' };
      const result = await service.getSummary(query, userId);

      expect(result.exercise.sessions).toBe(1);
      expect(result.exercise.totalDurationMs).toBe(3600000);
    });

    it('should return period boundaries for day range', async () => {
      setupEmptySummaryMocks();

      const query: SummaryQueryDto = { range: 'day', date: '2024-01-15' };
      const result = await service.getSummary(query, userId);

      expect(result.period.from.getHours()).toBe(0);
      expect(result.period.from.getMinutes()).toBe(0);
      expect(result.period.to.getHours()).toBe(23);
      expect(result.period.to.getMinutes()).toBe(59);
    });
  });

  // ============================================================
  // deleteMetrics
  // ============================================================

  describe('deleteMetrics', () => {
    it('should delete metrics by metric, time range, and userId', async () => {
      const dto: DeleteMetricsDto = {
        metric: 'steps',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
      };

      mockPrisma.healthMetric.deleteMany.mockResolvedValue({ count: 42 });

      const result = await service.deleteMetrics(dto, userId);

      expect(mockPrisma.healthMetric.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          metric: 'steps',
          timestamp: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lte: new Date('2024-01-31T23:59:59Z'),
          },
        },
      });
      expect(result).toEqual({ deleted: 42 });
    });

    it('should return zero deleted count when no matching records', async () => {
      const dto: DeleteMetricsDto = {
        metric: 'nonexistent',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
      };

      mockPrisma.healthMetric.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.deleteMetrics(dto, userId);

      expect(result).toEqual({ deleted: 0 });
    });
  });

  // ============================================================
  // updateRecord
  // ============================================================

  describe('updateRecord', () => {
    const table: HealthTableName = 'health_metrics';
    const dto: UpdateRecordDto = {
      updates: { notes: 'Updated notes' },
      updateSource: 'manual',
      updateComment: 'User correction',
    };

    it('should save revision before updating the record', async () => {
      const existingRecord = { id: recordId, version: 3, notes: 'Old notes' };
      mockPrisma.healthMetric.findFirst.mockResolvedValue(existingRecord as any);
      mockPrisma.healthRecordRevision.create.mockResolvedValue({} as any);
      mockPrisma.healthMetric.update.mockResolvedValue({
        ...existingRecord,
        notes: 'Updated notes',
        version: 4,
      } as any);

      await service.updateRecord(table, recordId, dto, userId);

      expect(mockPrisma.healthRecordRevision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tableName: table,
          recordId,
          version: 3,
          previousData: existingRecord,
          changedByUserId: userId,
          changeSource: 'manual',
          changeComment: 'User correction',
        }),
      });
    });

    it('should increment version on update', async () => {
      const existingRecord = { id: recordId, version: 2, notes: 'Old' };
      mockPrisma.healthMetric.findFirst.mockResolvedValue(existingRecord as any);
      mockPrisma.healthRecordRevision.create.mockResolvedValue({} as any);
      mockPrisma.healthMetric.update.mockResolvedValue({} as any);

      await service.updateRecord(table, recordId, dto, userId);

      expect(mockPrisma.healthMetric.update).toHaveBeenCalledWith({
        where: { id: recordId },
        data: expect.objectContaining({
          version: { increment: 1 },
          updatedByUserId: userId,
          updateSource: 'manual',
        }),
      });
    });

    it('should throw NotFoundException when record not owned by user', async () => {
      mockPrisma.healthMetric.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRecord(table, recordId, dto, userId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updateRecord(table, recordId, dto, userId),
      ).rejects.toThrow(`Record not found in ${table}`);
    });

    it('should update sleep session record', async () => {
      const sleepRecord = { id: recordId, version: 1, notes: null };
      mockPrisma.healthSleepSession.findFirst.mockResolvedValue(sleepRecord as any);
      mockPrisma.healthRecordRevision.create.mockResolvedValue({} as any);
      mockPrisma.healthSleepSession.update.mockResolvedValue({} as any);

      await service.updateRecord('health_sleep_sessions', recordId, dto, userId);

      expect(mockPrisma.healthSleepSession.update).toHaveBeenCalled();
    });
  });

  // ============================================================
  // listMoodScales
  // ============================================================

  describe('listMoodScales', () => {
    it('should return only active mood scales for user', async () => {
      const scales = [
        { id: 'scale-1', userId, scaleName: 'Mood', isActive: true },
        { id: 'scale-2', userId, scaleName: 'Energy', isActive: true },
      ];
      mockPrisma.healthMoodScale.findMany.mockResolvedValue(scales as any);

      const result = await service.listMoodScales(userId);

      expect(mockPrisma.healthMoodScale.findMany).toHaveBeenCalledWith({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(scales);
    });
  });

  // ============================================================
  // createMoodScale
  // ============================================================

  describe('createMoodScale', () => {
    it('should create mood scale with userId', async () => {
      const dto: CreateMoodScaleDto = {
        scaleName: 'Anxiety',
        minValue: 0,
        maxValue: 10,
        labels: { 0: 'None', 5: 'Moderate', 10: 'Severe' },
      };

      const created = { id: 'scale-new', userId, ...dto, isActive: true };
      mockPrisma.healthMoodScale.create.mockResolvedValue(created as any);

      const result = await service.createMoodScale(dto, userId);

      expect(mockPrisma.healthMoodScale.create).toHaveBeenCalledWith({
        data: {
          userId,
          scaleName: 'Anxiety',
          minValue: 0,
          maxValue: 10,
          labels: dto.labels,
          icon: null,
        },
      });
      expect(result).toEqual(created);
    });

    it('should include icon when provided', async () => {
      const dto: CreateMoodScaleDto = {
        scaleName: 'Stress',
        minValue: 1,
        maxValue: 5,
        labels: {},
        icon: 'stress-icon',
      };

      mockPrisma.healthMoodScale.create.mockResolvedValue({ id: 'scale-stress' } as any);

      await service.createMoodScale(dto, userId);

      expect(mockPrisma.healthMoodScale.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ icon: 'stress-icon' }),
      });
    });
  });

  // ============================================================
  // deleteMoodScale
  // ============================================================

  describe('deleteMoodScale', () => {
    it('should soft delete by setting isActive to false', async () => {
      const scale = { id: 'scale-1', userId, isActive: true };
      mockPrisma.healthMoodScale.findFirst.mockResolvedValue(scale as any);
      mockPrisma.healthMoodScale.update.mockResolvedValue({
        ...scale,
        isActive: false,
      } as any);

      await service.deleteMoodScale('scale-1', userId);

      expect(mockPrisma.healthMoodScale.update).toHaveBeenCalledWith({
        where: { id: 'scale-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when mood scale not found', async () => {
      mockPrisma.healthMoodScale.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMoodScale('nonexistent', userId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.deleteMoodScale('nonexistent', userId),
      ).rejects.toThrow('Mood scale not found');
    });

    it('should only delete scales belonging to user', async () => {
      mockPrisma.healthMoodScale.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMoodScale('other-user-scale', userId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.healthMoodScale.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-user-scale', userId },
      });
    });
  });

  // ============================================================
  // updateMoodScale
  // ============================================================

  describe('updateMoodScale', () => {
    it('should update mood scale fields', async () => {
      const scale = { id: 'scale-1', userId, scaleName: 'Mood', isActive: true };
      mockPrisma.healthMoodScale.findFirst.mockResolvedValue(scale as any);
      mockPrisma.healthMoodScale.update.mockResolvedValue({
        ...scale,
        isActive: false,
      } as any);

      const dto: UpdateMoodScaleDto = { isActive: false };
      await service.updateMoodScale('scale-1', dto, userId);

      expect(mockPrisma.healthMoodScale.update).toHaveBeenCalledWith({
        where: { id: 'scale-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when scale not found', async () => {
      mockPrisma.healthMoodScale.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMoodScale('missing-scale', {}, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // createSession
  // ============================================================

  describe('createSession', () => {
    it('should create health session with userId', async () => {
      const dto: CreateSessionDto = {
        name: 'January Wellness',
        startDate: '2024-01-01T00:00:00Z',
        description: 'Monthly health tracking',
        tags: { category: 'wellness', month: 'january' },
      };

      const created = { id: 'session-new', userId, ...dto };
      mockPrisma.healthSession.create.mockResolvedValue(created as any);

      const result = await service.createSession(dto, userId);

      expect(mockPrisma.healthSession.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: 'January Wellness',
          description: 'Monthly health tracking',
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: null,
          tags: { category: 'wellness', month: 'january' },
        },
      });
      expect(result).toEqual(created);
    });
  });

  // ============================================================
  // linkSessionRecords / unlinkSessionRecords
  // ============================================================

  describe('linkSessionRecords', () => {
    it('should link records to session', async () => {
      const session = { id: 'session-1', userId };
      const metricId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const sleepId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
      const dto: SessionRecordsDto = {
        records: [
          { tableName: 'health_metrics', recordId: metricId },
          { tableName: 'health_sleep_sessions', recordId: sleepId },
        ],
      };

      mockPrisma.healthSession.findFirst.mockResolvedValue(session as any);
      mockPrisma.healthSessionRecord.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.healthSessionRecord.findMany.mockResolvedValue([
        { sessionId: 'session-1', tableName: 'health_metrics', recordId: metricId },
        { sessionId: 'session-1', tableName: 'health_sleep_sessions', recordId: sleepId },
      ] as any);

      const result = await service.linkSessionRecords('session-1', dto, userId);

      expect(mockPrisma.healthSessionRecord.createMany).toHaveBeenCalledWith({
        data: [
          { sessionId: 'session-1', tableName: 'health_metrics', recordId: metricId },
          { sessionId: 'session-1', tableName: 'health_sleep_sessions', recordId: sleepId },
        ],
        skipDuplicates: true,
      });
      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException when session not owned by user', async () => {
      mockPrisma.healthSession.findFirst.mockResolvedValue(null);

      await expect(
        service.linkSessionRecords('nonexistent-session', { records: [] }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlinkSessionRecords', () => {
    it('should unlink records from session', async () => {
      const session = { id: 'session-1', userId };
      const metricId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const dto: SessionRecordsDto = {
        records: [{ tableName: 'health_metrics', recordId: metricId }],
      };

      mockPrisma.healthSession.findFirst.mockResolvedValue(session as any);
      mockPrisma.healthSessionRecord.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unlinkSessionRecords('session-1', dto, userId);

      expect(mockPrisma.healthSessionRecord.deleteMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-1',
          OR: [{ tableName: 'health_metrics', recordId: metricId }],
        },
      });
      expect(result).toEqual({ unlinked: 1 });
    });

    it('should throw NotFoundException when session not owned by user', async () => {
      mockPrisma.healthSession.findFirst.mockResolvedValue(null);

      await expect(
        service.unlinkSessionRecords('nonexistent-session', { records: [] }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // createAttachment
  // ============================================================

  describe('createAttachment', () => {
    it('should link storage object to health record', async () => {
      const storageObjId = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
      const dto: CreateAttachmentDto = {
        storageObjectId: storageObjId,
        caption: 'Lab report scan',
        sortOrder: 0,
      };

      const storageObject = { id: storageObjId, uploadedById: userId };
      mockPrisma.storageObject.findFirst.mockResolvedValue(storageObject as any);
      mockPrisma.healthRecordAttachment.create.mockResolvedValue({
        id: 'attachment-1',
        ...dto,
      } as any);

      const result = await service.createAttachment(
        'health_metrics',
        recordId,
        dto,
        userId,
      );

      expect(mockPrisma.storageObject.findFirst).toHaveBeenCalledWith({
        where: { id: storageObjId, uploadedById: userId },
      });
      expect(mockPrisma.healthRecordAttachment.create).toHaveBeenCalledWith({
        data: {
          userId,
          tableName: 'health_metrics',
          recordId,
          storageObjectId: storageObjId,
          caption: 'Lab report scan',
          sortOrder: 0,
        },
        include: { storageObject: true },
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when storage object not owned by user', async () => {
      mockPrisma.storageObject.findFirst.mockResolvedValue(null);

      const dto: CreateAttachmentDto = {
        storageObjectId: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        sortOrder: 0,
      };

      await expect(
        service.createAttachment('health_metrics', recordId, dto, userId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createAttachment('health_metrics', recordId, dto, userId),
      ).rejects.toThrow('Storage object not found or not owned by user');
    });
  });

  // ============================================================
  // createComment
  // ============================================================

  describe('createComment', () => {
    it('should create comment on health record', async () => {
      const dto: CreateCommentDto = {
        comment: 'Felt great after this workout',
        commentType: 'note',
      };

      const created = {
        id: 'comment-1',
        userId,
        tableName: 'health_exercise_sessions',
        recordId,
        comment: dto.comment,
      };
      mockPrisma.healthRecordComment.create.mockResolvedValue(created as any);

      const result = await service.createComment(
        'health_exercise_sessions',
        recordId,
        dto,
        userId,
      );

      expect(mockPrisma.healthRecordComment.create).toHaveBeenCalledWith({
        data: {
          userId,
          tableName: 'health_exercise_sessions',
          recordId,
          comment: 'Felt great after this workout',
          commentType: 'note',
        },
      });
      expect(result).toEqual(created);
    });
  });

  // ============================================================
  // updateComment
  // ============================================================

  describe('updateComment', () => {
    it('should verify ownership before updating comment', async () => {
      const comment = { id: 'comment-1', userId, comment: 'Original text' };
      const dto: UpdateCommentDto = { comment: 'Updated text' };

      mockPrisma.healthRecordComment.findFirst.mockResolvedValue(comment as any);
      mockPrisma.healthRecordComment.update.mockResolvedValue({
        ...comment,
        comment: 'Updated text',
      } as any);

      await service.updateComment('comment-1', dto, userId);

      expect(mockPrisma.healthRecordComment.findFirst).toHaveBeenCalledWith({
        where: { id: 'comment-1', userId },
      });
      expect(mockPrisma.healthRecordComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { comment: 'Updated text', updatedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when comment not owned by user', async () => {
      mockPrisma.healthRecordComment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateComment('nonexistent-comment', { comment: 'x' }, userId),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.updateComment('nonexistent-comment', { comment: 'x' }, userId),
      ).rejects.toThrow('Comment not found');
    });
  });

  // ============================================================
  // deleteComment
  // ============================================================

  describe('deleteComment', () => {
    it('should verify ownership before deleting comment', async () => {
      const comment = { id: 'comment-1', userId };
      mockPrisma.healthRecordComment.findFirst.mockResolvedValue(comment as any);
      mockPrisma.healthRecordComment.delete.mockResolvedValue(comment as any);

      const result = await service.deleteComment('comment-1', userId);

      expect(mockPrisma.healthRecordComment.findFirst).toHaveBeenCalledWith({
        where: { id: 'comment-1', userId },
      });
      expect(mockPrisma.healthRecordComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when comment not owned by user', async () => {
      mockPrisma.healthRecordComment.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteComment('nonexistent-comment', userId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.healthRecordComment.delete).not.toHaveBeenCalled();
    });
  });
});

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MetricsQueryDto,
  GroupedMetricsQueryDto,
  SleepQueryDto,
  ExerciseQueryDto,
  NutritionQueryDto,
  CycleQueryDto,
  LabsQueryDto,
  SummaryQueryDto,
  DeleteMetricsDto,
} from './dto/health-query.dto';
import { HealthTableName, UpdateRecordDto } from './dto/update-record.dto';
import { CreateMoodScaleDto, UpdateMoodScaleDto } from './dto/mood-scale.dto';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionRecordsDto,
  SessionsQueryDto,
} from './dto/session.dto';
import { CreateAttachmentDto } from './dto/attachment.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@Injectable()
export class HealthDataService {
  private readonly logger = new Logger(HealthDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // METRICS
  // ============================================================

  async queryMetrics(query: MetricsQueryDto, userId: string) {
    const { metric, from, to, page, pageSize, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (metric) where.metric = metric;
    if (from || to) {
      const timestamp: Record<string, Date> = {};
      if (from) timestamp.gte = new Date(from);
      if (to) timestamp.lte = new Date(to);
      where.timestamp = timestamp;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.healthMetric.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { timestamp: sortOrder },
      }),
      this.prisma.healthMetric.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async queryGroupedMetrics(query: GroupedMetricsQueryDto, userId: string) {
    const { groupId, metric, from, to, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId, groupId: { not: null } };
    if (groupId) where.groupId = groupId;
    if (metric) where.metric = metric;
    if (from || to) {
      const timestamp: Record<string, Date> = {};
      if (from) timestamp.gte = new Date(from);
      if (to) timestamp.lte = new Date(to);
      where.timestamp = timestamp;
    }

    const items = await this.prisma.healthMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize * 2,
    });

    const groups: Record<string, unknown[]> = {};
    for (const item of items) {
      if (item.groupId) {
        if (!groups[item.groupId]) groups[item.groupId] = [];
        groups[item.groupId].push(item);
      }
    }

    return { groups: Object.values(groups) };
  }

  // ============================================================
  // SLEEP
  // ============================================================

  async querySleep(query: SleepQueryDto, userId: string) {
    const { from, to, page, pageSize, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (from || to) {
      const startTime: Record<string, Date> = {};
      if (from) startTime.gte = new Date(from);
      if (to) startTime.lte = new Date(to);
      where.startTime = startTime;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.healthSleepSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startTime: sortOrder },
        include: { stages: true },
      }),
      this.prisma.healthSleepSession.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  // ============================================================
  // EXERCISE
  // ============================================================

  async queryExercise(query: ExerciseQueryDto, userId: string) {
    const { exerciseType, from, to, page, pageSize, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (exerciseType) where.exerciseType = exerciseType;
    if (from || to) {
      const startTime: Record<string, Date> = {};
      if (from) startTime.gte = new Date(from);
      if (to) startTime.lte = new Date(to);
      where.startTime = startTime;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.healthExerciseSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startTime: sortOrder },
      }),
      this.prisma.healthExerciseSession.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  // ============================================================
  // NUTRITION
  // ============================================================

  async queryNutrition(query: NutritionQueryDto, userId: string) {
    const { mealType, from, to, page, pageSize, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (mealType) where.mealType = mealType;
    if (from || to) {
      const startTime: Record<string, Date> = {};
      if (from) startTime.gte = new Date(from);
      if (to) startTime.lte = new Date(to);
      where.startTime = startTime;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.healthNutrition.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startTime: sortOrder },
      }),
      this.prisma.healthNutrition.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  // ============================================================
  // CYCLE
  // ============================================================

  async queryCycle(query: CycleQueryDto, userId: string) {
    const { eventType, from, to, page, pageSize, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (eventType) where.eventType = eventType;
    if (from || to) {
      const timestamp: Record<string, Date> = {};
      if (from) timestamp.gte = new Date(from);
      if (to) timestamp.lte = new Date(to);
      where.timestamp = timestamp;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.healthCycleEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { timestamp: sortOrder },
      }),
      this.prisma.healthCycleEvent.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  // ============================================================
  // LABS
  // ============================================================

  async queryLabs(query: LabsQueryDto, userId: string) {
    const { testName, panelName, from, to, page, pageSize, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (testName) where.testName = testName;
    if (panelName) where.panelName = panelName;
    if (from || to) {
      const timestamp: Record<string, Date> = {};
      if (from) timestamp.gte = new Date(from);
      if (to) timestamp.lte = new Date(to);
      where.timestamp = timestamp;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.healthLabResult.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { timestamp: sortOrder },
      }),
      this.prisma.healthLabResult.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  async getSummary(query: SummaryQueryDto, userId: string) {
    const date = query.date ? new Date(query.date) : new Date();
    let from: Date;
    let to: Date;

    if (query.range === 'day') {
      from = new Date(date);
      from.setHours(0, 0, 0, 0);
      to = new Date(date);
      to.setHours(23, 59, 59, 999);
    } else if (query.range === 'week') {
      from = new Date(date);
      from.setDate(from.getDate() - from.getDay());
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else {
      from = new Date(date.getFullYear(), date.getMonth(), 1);
      to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const timeRange = { gte: from, lte: to };

    const [
      stepsData,
      heartRateData,
      sleepData,
      weightData,
      bpData,
      caloriesData,
      exerciseData,
    ] = await Promise.all([
      this.prisma.healthMetric.aggregate({
        where: { userId, metric: 'steps', timestamp: timeRange },
        _sum: { value: true },
        _avg: { value: true },
      }),
      this.prisma.healthMetric.aggregate({
        where: { userId, metric: 'heart_rate', timestamp: timeRange },
        _min: { value: true },
        _max: { value: true },
        _avg: { value: true },
      }),
      this.prisma.healthSleepSession.findMany({
        where: { userId, startTime: timeRange },
        include: { stages: true },
      }),
      this.prisma.healthMetric.findFirst({
        where: { userId, metric: 'weight', timestamp: timeRange },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.healthMetric.findFirst({
        where: { userId, metric: 'systolic_bp', timestamp: timeRange },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.healthMetric.aggregate({
        where: { userId, metric: 'active_calories', timestamp: timeRange },
        _sum: { value: true },
      }),
      this.prisma.healthExerciseSession.findMany({
        where: { userId, startTime: timeRange },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const [restingHr, diastolicBp, latestSteps, latestHr] = await Promise.all([
      this.prisma.healthMetric.findFirst({
        where: { userId, metric: 'resting_heart_rate', timestamp: timeRange },
        orderBy: { timestamp: 'desc' },
      }),
      bpData
        ? this.prisma.healthMetric.findFirst({
            where: {
              userId,
              metric: 'diastolic_bp',
              groupId: bpData.groupId ?? undefined,
              timestamp: timeRange,
            },
            orderBy: { timestamp: 'desc' },
          })
        : Promise.resolve(null),
      this.prisma.healthMetric.findFirst({
        where: { userId, metric: 'steps', timestamp: timeRange },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.healthMetric.findFirst({
        where: { userId, metric: 'heart_rate', timestamp: timeRange },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const sleepStages = { deep: 0, light: 0, rem: 0, awake: 0 };
    let totalSleepMs = 0;
    for (const session of sleepData) {
      if (session.durationMs) {
        totalSleepMs += Number(session.durationMs);
      } else {
        totalSleepMs += session.endTime.getTime() - session.startTime.getTime();
      }
      for (const stage of session.stages) {
        const durationMs = stage.endTime.getTime() - stage.startTime.getTime();
        if (stage.stage in sleepStages) {
          sleepStages[stage.stage as keyof typeof sleepStages] += durationMs;
        }
      }
    }

    let exerciseTotalMs = 0;
    for (const ex of exerciseData) {
      exerciseTotalMs += ex.endTime.getTime() - ex.startTime.getTime();
    }

    return {
      period: { from, to },
      steps: {
        total: stepsData._sum.value ?? 0,
        average: stepsData._avg.value ?? 0,
        latest: latestSteps?.value ?? null,
      },
      heartRate: {
        min: heartRateData._min.value ?? null,
        max: heartRateData._max.value ?? null,
        average: heartRateData._avg.value ?? null,
        resting: restingHr?.value ?? null,
        latest: latestHr?.value ?? null,
      },
      sleep: {
        totalDurationMs: totalSleepMs,
        stages: sleepStages,
      },
      weight: { latest: weightData?.value ?? null },
      bloodPressure: {
        latest: bpData
          ? {
              systolic: bpData.value,
              diastolic: diastolicBp?.value ?? null,
            }
          : null,
      },
      activeCalories: { total: caloriesData._sum.value ?? 0 },
      exercise: {
        sessions: exerciseData.length,
        totalDurationMs: exerciseTotalMs,
      },
    };
  }

  // ============================================================
  // DELETE METRICS
  // ============================================================

  async deleteMetrics(dto: DeleteMetricsDto, userId: string) {
    const result = await this.prisma.healthMetric.deleteMany({
      where: {
        userId,
        metric: dto.metric,
        timestamp: {
          gte: new Date(dto.from),
          lte: new Date(dto.to),
        },
      },
    });
    this.logger.log(
      `Deleted ${result.count} metrics (${dto.metric}) for user ${userId}`,
    );
    return { deleted: result.count };
  }

  // ============================================================
  // UPDATE RECORD (polymorphic)
  // ============================================================

  async updateRecord(
    table: HealthTableName,
    id: string,
    dto: UpdateRecordDto,
    userId: string,
  ) {
    const record = await this.findAndVerifyOwnership(table, id, userId);

    // Save revision before updating
    await this.prisma.healthRecordRevision.create({
      data: {
        tableName: table,
        recordId: id,
        version: (record as { version: number }).version,
        previousData: record as Prisma.InputJsonValue,
        changedByUserId: userId,
        changeSource: dto.updateSource,
        changeComment: dto.updateComment ?? null,
      },
    });

    const updateData = {
      ...dto.updates,
      version: { increment: 1 },
      updatedAt: new Date(),
      updatedByUserId: userId,
      updateSource: dto.updateSource,
      updateComment: dto.updateComment ?? null,
    };

    return this.updateRecord_internal(table, id, updateData);
  }

  private async findAndVerifyOwnership(
    table: HealthTableName,
    id: string,
    userId: string,
  ) {
    let record: unknown = null;

    switch (table) {
      case 'health_metrics':
        record = await this.prisma.healthMetric.findFirst({
          where: { id, userId },
        });
        break;
      case 'health_sleep_sessions':
        record = await this.prisma.healthSleepSession.findFirst({
          where: { id, userId },
        });
        break;
      case 'health_exercise_sessions':
        record = await this.prisma.healthExerciseSession.findFirst({
          where: { id, userId },
        });
        break;
      case 'health_nutrition':
        record = await this.prisma.healthNutrition.findFirst({
          where: { id, userId },
        });
        break;
      case 'health_cycle_events':
        record = await this.prisma.healthCycleEvent.findFirst({
          where: { id, userId },
        });
        break;
      case 'health_lab_results':
        record = await this.prisma.healthLabResult.findFirst({
          where: { id, userId },
        });
        break;
    }

    if (!record) {
      throw new NotFoundException(`Record not found in ${table}`);
    }
    return record;
  }

  private async updateRecord_internal(
    table: HealthTableName,
    id: string,
    data: Record<string, unknown>,
  ) {
    switch (table) {
      case 'health_metrics':
        return this.prisma.healthMetric.update({ where: { id }, data });
      case 'health_sleep_sessions':
        return this.prisma.healthSleepSession.update({ where: { id }, data });
      case 'health_exercise_sessions':
        return this.prisma.healthExerciseSession.update({ where: { id }, data });
      case 'health_nutrition':
        return this.prisma.healthNutrition.update({ where: { id }, data });
      case 'health_cycle_events':
        return this.prisma.healthCycleEvent.update({ where: { id }, data });
      case 'health_lab_results':
        return this.prisma.healthLabResult.update({ where: { id }, data });
    }
  }

  // ============================================================
  // REVISIONS
  // ============================================================

  async getRevisions(table: HealthTableName, id: string, userId: string) {
    await this.findAndVerifyOwnership(table, id, userId);

    return this.prisma.healthRecordRevision.findMany({
      where: { tableName: table, recordId: id },
      orderBy: { version: 'desc' },
    });
  }

  // ============================================================
  // MOOD SCALES
  // ============================================================

  async listMoodScales(userId: string) {
    return this.prisma.healthMoodScale.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMoodScale(dto: CreateMoodScaleDto, userId: string) {
    return this.prisma.healthMoodScale.create({
      data: {
        userId,
        scaleName: dto.scaleName,
        minValue: dto.minValue,
        maxValue: dto.maxValue,
        labels: dto.labels,
        icon: dto.icon ?? null,
      },
    });
  }

  async updateMoodScale(
    id: string,
    dto: UpdateMoodScaleDto,
    userId: string,
  ) {
    const scale = await this.prisma.healthMoodScale.findFirst({
      where: { id, userId },
    });
    if (!scale) throw new NotFoundException('Mood scale not found');

    return this.prisma.healthMoodScale.update({
      where: { id },
      data: {
        ...(dto.labels !== undefined && { labels: dto.labels }),
        ...(dto.minValue !== undefined && { minValue: dto.minValue }),
        ...(dto.maxValue !== undefined && { maxValue: dto.maxValue }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteMoodScale(id: string, userId: string) {
    const scale = await this.prisma.healthMoodScale.findFirst({
      where: { id, userId },
    });
    if (!scale) throw new NotFoundException('Mood scale not found');

    return this.prisma.healthMoodScale.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================================
  // SESSIONS
  // ============================================================

  async listSessions(query: SessionsQueryDto, userId: string) {
    const { status, from, to, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (from || to) {
      const startDate: Record<string, Date> = {};
      if (from) startDate.gte = new Date(from);
      if (to) startDate.lte = new Date(to);
      where.startDate = startDate;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.healthSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { records: true } } },
      }),
      this.prisma.healthSession.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async createSession(dto: CreateSessionDto, userId: string) {
    return this.prisma.healthSession.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        tags: dto.tags ? (dto.tags as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async getSession(id: string, userId: string) {
    const session = await this.prisma.healthSession.findFirst({
      where: { id, userId },
      include: { _count: { select: { records: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async updateSession(id: string, dto: UpdateSessionDto, userId: string) {
    const session = await this.prisma.healthSession.findFirst({
      where: { id, userId },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.healthSession.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.tags !== undefined && {
          tags: dto.tags
            ? (dto.tags as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        }),
      },
    });
  }

  async deleteSession(id: string, userId: string) {
    const session = await this.prisma.healthSession.findFirst({
      where: { id, userId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.healthSession.delete({ where: { id } });
    return { deleted: true };
  }

  async getSessionRecords(id: string, userId: string) {
    const session = await this.prisma.healthSession.findFirst({
      where: { id, userId },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.healthSessionRecord.findMany({
      where: { sessionId: id },
      orderBy: { addedAt: 'desc' },
    });
  }

  async linkSessionRecords(
    id: string,
    dto: SessionRecordsDto,
    userId: string,
  ) {
    const session = await this.prisma.healthSession.findFirst({
      where: { id, userId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.healthSessionRecord.createMany({
      data: dto.records.map((r) => ({
        sessionId: id,
        tableName: r.tableName,
        recordId: r.recordId,
      })),
      skipDuplicates: true,
    });

    return this.prisma.healthSessionRecord.findMany({
      where: { sessionId: id },
      orderBy: { addedAt: 'desc' },
    });
  }

  async unlinkSessionRecords(
    id: string,
    dto: SessionRecordsDto,
    userId: string,
  ) {
    const session = await this.prisma.healthSession.findFirst({
      where: { id, userId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const result = await this.prisma.healthSessionRecord.deleteMany({
      where: {
        sessionId: id,
        OR: dto.records.map((r) => ({
          tableName: r.tableName,
          recordId: r.recordId,
        })),
      },
    });

    return { unlinked: result.count };
  }

  // ============================================================
  // ATTACHMENTS
  // ============================================================

  async listAttachments(table: string, recordId: string, userId: string) {
    return this.prisma.healthRecordAttachment.findMany({
      where: { tableName: table, recordId, userId },
      orderBy: { sortOrder: 'asc' },
      include: { storageObject: true },
    });
  }

  async createAttachment(
    table: string,
    recordId: string,
    dto: CreateAttachmentDto,
    userId: string,
  ) {
    // Verify the storage object belongs to the user
    const storageObject = await this.prisma.storageObject.findFirst({
      where: { id: dto.storageObjectId, uploadedById: userId },
    });
    if (!storageObject) {
      throw new BadRequestException('Storage object not found or not owned by user');
    }

    return this.prisma.healthRecordAttachment.create({
      data: {
        userId,
        tableName: table,
        recordId,
        storageObjectId: dto.storageObjectId,
        caption: dto.caption ?? null,
        sortOrder: dto.sortOrder,
      },
      include: { storageObject: true },
    });
  }

  async deleteAttachment(id: string, userId: string) {
    const attachment = await this.prisma.healthRecordAttachment.findFirst({
      where: { id, userId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.prisma.healthRecordAttachment.delete({ where: { id } });
    return { deleted: true };
  }

  // ============================================================
  // COMMENTS
  // ============================================================

  async listComments(table: string, recordId: string, userId: string) {
    return this.prisma.healthRecordComment.findMany({
      where: { tableName: table, recordId, userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createComment(
    table: string,
    recordId: string,
    dto: CreateCommentDto,
    userId: string,
  ) {
    return this.prisma.healthRecordComment.create({
      data: {
        userId,
        tableName: table,
        recordId,
        comment: dto.comment,
        commentType: dto.commentType,
      },
    });
  }

  async updateComment(
    id: string,
    dto: UpdateCommentDto,
    userId: string,
  ) {
    const comment = await this.prisma.healthRecordComment.findFirst({
      where: { id, userId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.healthRecordComment.update({
      where: { id },
      data: {
        comment: dto.comment,
        updatedAt: new Date(),
      },
    });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.healthRecordComment.findFirst({
      where: { id, userId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.prisma.healthRecordComment.delete({ where: { id } });
    return { deleted: true };
  }
}

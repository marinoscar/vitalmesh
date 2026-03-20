import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/roles.constants';
import { HealthDataService } from './health-data.service';

import {
  metricsQuerySchema,
  MetricsQueryDto,
  groupedMetricsQuerySchema,
  GroupedMetricsQueryDto,
  sleepQuerySchema,
  SleepQueryDto,
  exerciseQuerySchema,
  ExerciseQueryDto,
  nutritionQuerySchema,
  NutritionQueryDto,
  cycleQuerySchema,
  CycleQueryDto,
  labsQuerySchema,
  LabsQueryDto,
  summaryQuerySchema,
  SummaryQueryDto,
  deleteMetricsSchema,
  DeleteMetricsDto,
} from './dto/health-query.dto';
import {
  healthTableNames,
  HealthTableName,
  updateRecordSchema,
  UpdateRecordDto,
} from './dto/update-record.dto';
import {
  createMoodScaleSchema,
  CreateMoodScaleDto,
  updateMoodScaleSchema,
  UpdateMoodScaleDto,
} from './dto/mood-scale.dto';
import {
  createSessionSchema,
  CreateSessionDto,
  updateSessionSchema,
  UpdateSessionDto,
  sessionRecordsSchema,
  SessionRecordsDto,
  sessionsQuerySchema,
  SessionsQueryDto,
} from './dto/session.dto';
import { createAttachmentSchema, CreateAttachmentDto } from './dto/attachment.dto';
import {
  createCommentSchema,
  CreateCommentDto,
  updateCommentSchema,
  UpdateCommentDto,
} from './dto/comment.dto';

// ============================================================
// IMPORTANT: Route ordering matters in NestJS (Fastify).
// Specific literal routes must be declared BEFORE parameterized
// routes. E.g. GET /metrics/grouped before GET /:table/:id
// ============================================================

@ApiTags('Health Data')
@Controller('health-data')
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  // ============================================================
  // QUERY ENDPOINTS - specific literal paths first
  // ============================================================

  @Get('metrics')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Query health metrics with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of health metrics' })
  async queryMetrics(
    @Query(new ZodValidationPipe(metricsQuerySchema)) query: MetricsQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.queryMetrics(query, userId);
    return { data: result.items, meta: result.meta };
  }

  @Get('metrics/grouped')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Query grouped metrics (e.g. blood pressure pairs)' })
  @ApiResponse({ status: 200, description: 'Grouped metrics by groupId' })
  async queryGroupedMetrics(
    @Query(new ZodValidationPipe(groupedMetricsQuerySchema))
    query: GroupedMetricsQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.queryGroupedMetrics(query, userId);
    return { data: result };
  }

  @Get('sleep')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Query sleep sessions with stages' })
  @ApiResponse({ status: 200, description: 'Paginated list of sleep sessions' })
  async querySleep(
    @Query(new ZodValidationPipe(sleepQuerySchema)) query: SleepQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.querySleep(query, userId);
    return { data: result.items, meta: result.meta };
  }

  @Get('exercise')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Query exercise sessions' })
  @ApiResponse({ status: 200, description: 'Paginated list of exercise sessions' })
  async queryExercise(
    @Query(new ZodValidationPipe(exerciseQuerySchema)) query: ExerciseQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.queryExercise(query, userId);
    return { data: result.items, meta: result.meta };
  }

  @Get('nutrition')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Query nutrition entries' })
  @ApiResponse({ status: 200, description: 'Paginated list of nutrition entries' })
  async queryNutrition(
    @Query(new ZodValidationPipe(nutritionQuerySchema)) query: NutritionQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.queryNutrition(query, userId);
    return { data: result.items, meta: result.meta };
  }

  @Get('cycle')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Query cycle tracking events' })
  @ApiResponse({ status: 200, description: 'Paginated list of cycle events' })
  async queryCycle(
    @Query(new ZodValidationPipe(cycleQuerySchema)) query: CycleQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.queryCycle(query, userId);
    return { data: result.items, meta: result.meta };
  }

  @Get('labs')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Query lab results' })
  @ApiResponse({ status: 200, description: 'Paginated list of lab results' })
  async queryLabs(
    @Query(new ZodValidationPipe(labsQuerySchema)) query: LabsQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.queryLabs(query, userId);
    return { data: result.items, meta: result.meta };
  }

  @Get('summary')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Get health data summary for a date range' })
  @ApiResponse({ status: 200, description: 'Aggregated health summary' })
  async getSummary(
    @Query(new ZodValidationPipe(summaryQuerySchema)) query: SummaryQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.getSummary(query, userId);
    return { data };
  }

  // ============================================================
  // DELETE METRICS
  // ============================================================

  @Delete('metrics')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_DELETE] })
  @ApiOperation({ summary: 'Delete metrics by type and time range' })
  @ApiResponse({ status: 200, description: 'Number of deleted records' })
  async deleteMetrics(
    @Body(new ZodValidationPipe(deleteMetricsSchema)) dto: DeleteMetricsDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.deleteMetrics(dto, userId);
    return { data };
  }

  // ============================================================
  // MOOD SCALES - specific literal path before /:table/:id
  // ============================================================

  @Get('mood-scales')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'List user mood scales' })
  @ApiResponse({ status: 200, description: 'List of active mood scales' })
  async listMoodScales(@CurrentUser('id') userId: string) {
    const data = await this.healthDataService.listMoodScales(userId);
    return { data };
  }

  @Post('mood-scales')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Create a mood scale' })
  @ApiResponse({ status: 201, description: 'Created mood scale' })
  async createMoodScale(
    @Body(new ZodValidationPipe(createMoodScaleSchema)) dto: CreateMoodScaleDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.createMoodScale(dto, userId);
    return { data };
  }

  @Patch('mood-scales/:id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Update a mood scale' })
  @ApiParam({ name: 'id', description: 'Mood scale ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Updated mood scale' })
  async updateMoodScale(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMoodScaleSchema)) dto: UpdateMoodScaleDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.updateMoodScale(id, dto, userId);
    return { data };
  }

  @Delete('mood-scales/:id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Soft-delete a mood scale' })
  @ApiParam({ name: 'id', description: 'Mood scale ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Mood scale deactivated' })
  async deleteMoodScale(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.deleteMoodScale(id, userId);
    return { data };
  }

  // ============================================================
  // SESSIONS - specific literal path before /:table/:id
  // ============================================================

  @Get('sessions')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'List health sessions' })
  @ApiResponse({ status: 200, description: 'Paginated list of sessions' })
  async listSessions(
    @Query(new ZodValidationPipe(sessionsQuerySchema)) query: SessionsQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.healthDataService.listSessions(query, userId);
    return { data: result.items, meta: result.meta };
  }

  @Post('sessions')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Create a health session' })
  @ApiResponse({ status: 201, description: 'Created session' })
  async createSession(
    @Body(new ZodValidationPipe(createSessionSchema)) dto: CreateSessionDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.createSession(dto, userId);
    return { data };
  }

  @Get('sessions/:id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Get a health session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Session details' })
  async getSession(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.getSession(id, userId);
    return { data };
  }

  @Patch('sessions/:id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Update a health session' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Updated session' })
  async updateSession(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSessionSchema)) dto: UpdateSessionDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.updateSession(id, dto, userId);
    return { data };
  }

  @Delete('sessions/:id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Delete a health session' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  async deleteSession(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.deleteSession(id, userId);
    return { data };
  }

  @Get('sessions/:id/records')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'List records linked to a session' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of session records' })
  async getSessionRecords(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.getSessionRecords(id, userId);
    return { data };
  }

  @Post('sessions/:id/records')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Link records to a session' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Records linked to session' })
  async linkSessionRecords(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sessionRecordsSchema)) dto: SessionRecordsDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.linkSessionRecords(id, dto, userId);
    return { data };
  }

  @Delete('sessions/:id/records')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Unlink records from a session' })
  @ApiParam({ name: 'id', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Records unlinked from session' })
  async unlinkSessionRecords(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sessionRecordsSchema)) dto: SessionRecordsDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.unlinkSessionRecords(id, dto, userId);
    return { data };
  }

  // ============================================================
  // ATTACHMENTS (standalone delete by attachmentId)
  // ============================================================

  @Delete('attachments/:attachmentId')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Delete an attachment by ID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.deleteAttachment(attachmentId, userId);
    return { data };
  }

  // ============================================================
  // COMMENTS (standalone update/delete by commentId)
  // ============================================================

  @Patch('comments/:commentId')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Update a comment by ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Updated comment' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) dto: UpdateCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.updateComment(commentId, dto, userId);
    return { data };
  }

  @Delete('comments/:commentId')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Delete a comment by ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.deleteComment(commentId, userId);
    return { data };
  }

  // ============================================================
  // GENERIC RECORD UPDATE / REVISIONS - parameterized routes LAST
  // ============================================================

  @Patch(':table/:id')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Update a health record with revision tracking' })
  @ApiParam({
    name: 'table',
    description: 'Table name',
    enum: healthTableNames,
  })
  @ApiParam({ name: 'id', description: 'Record ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Updated record' })
  async updateRecord(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRecordSchema)) dto: UpdateRecordDto,
    @CurrentUser('id') userId: string,
  ) {
    const validatedTable = table as HealthTableName;
    if (!healthTableNames.includes(validatedTable)) {
      throw new Error(`Invalid table: ${table}`);
    }
    const data = await this.healthDataService.updateRecord(
      validatedTable,
      id,
      dto,
      userId,
    );
    return { data };
  }

  @Get(':table/:id/revisions')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'Get revision history for a health record' })
  @ApiParam({
    name: 'table',
    description: 'Table name',
    enum: healthTableNames,
  })
  @ApiParam({ name: 'id', description: 'Record ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of revisions' })
  async getRevisions(
    @Param('table') table: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const validatedTable = table as HealthTableName;
    if (!healthTableNames.includes(validatedTable)) {
      throw new Error(`Invalid table: ${table}`);
    }
    const data = await this.healthDataService.getRevisions(
      validatedTable,
      id,
      userId,
    );
    return { data };
  }

  // ============================================================
  // ATTACHMENTS (polymorphic by :table/:id)
  // ============================================================

  @Get(':table/:id/attachments')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'List attachments for a health record' })
  @ApiParam({ name: 'table', description: 'Table name', enum: healthTableNames })
  @ApiParam({ name: 'id', description: 'Record ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of attachments' })
  async listAttachments(
    @Param('table') table: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.listAttachments(table, id, userId);
    return { data };
  }

  @Post(':table/:id/attachments')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Add an attachment to a health record' })
  @ApiParam({ name: 'table', description: 'Table name', enum: healthTableNames })
  @ApiParam({ name: 'id', description: 'Record ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Created attachment' })
  async createAttachment(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createAttachmentSchema)) dto: CreateAttachmentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.createAttachment(
      table,
      id,
      dto,
      userId,
    );
    return { data };
  }

  // ============================================================
  // COMMENTS (polymorphic by :table/:id)
  // ============================================================

  @Get(':table/:id/comments')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_READ] })
  @ApiOperation({ summary: 'List comments for a health record' })
  @ApiParam({ name: 'table', description: 'Table name', enum: healthTableNames })
  @ApiParam({ name: 'id', description: 'Record ID (UUID)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user (optional)' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  async listComments(
    @Param('table') table: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.listComments(table, id, userId);
    return { data };
  }

  @Post(':table/:id/comments')
  @Auth({ permissions: [PERMISSIONS.HEALTH_DATA_WRITE] })
  @ApiOperation({ summary: 'Add a comment to a health record' })
  @ApiParam({ name: 'table', description: 'Table name', enum: healthTableNames })
  @ApiParam({ name: 'id', description: 'Record ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Created comment' })
  async createComment(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createCommentSchema)) dto: CreateCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.healthDataService.createComment(
      table,
      id,
      dto,
      userId,
    );
    return { data };
  }
}

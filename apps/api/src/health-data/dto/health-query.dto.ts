import { z } from 'zod';

export const metricsQuerySchema = z.object({
  metric: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type MetricsQueryDto = z.infer<typeof metricsQuerySchema>;

export const groupedMetricsQuerySchema = z.object({
  groupId: z.string().uuid().optional(),
  metric: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type GroupedMetricsQueryDto = z.infer<typeof groupedMetricsQuerySchema>;

export const sleepQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type SleepQueryDto = z.infer<typeof sleepQuerySchema>;

export const exerciseQuerySchema = z.object({
  exerciseType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ExerciseQueryDto = z.infer<typeof exerciseQuerySchema>;

export const nutritionQuerySchema = z.object({
  mealType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type NutritionQueryDto = z.infer<typeof nutritionQuerySchema>;

export const cycleQuerySchema = z.object({
  eventType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type CycleQueryDto = z.infer<typeof cycleQuerySchema>;

export const labsQuerySchema = z.object({
  testName: z.string().optional(),
  panelName: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type LabsQueryDto = z.infer<typeof labsQuerySchema>;

export const summaryQuerySchema = z.object({
  date: z.string().datetime().optional(),
  range: z.enum(['day', 'week', 'month']).default('day'),
});
export type SummaryQueryDto = z.infer<typeof summaryQuerySchema>;

export const deleteMetricsSchema = z.object({
  metric: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
});
export type DeleteMetricsDto = z.infer<typeof deleteMetricsSchema>;

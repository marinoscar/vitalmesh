import { z } from 'zod';

export const healthTableNames = [
  'health_metrics',
  'health_sleep_sessions',
  'health_exercise_sessions',
  'health_nutrition',
  'health_cycle_events',
  'health_lab_results',
] as const;
export type HealthTableName = (typeof healthTableNames)[number];

export const updateRecordSchema = z.object({
  updates: z.record(z.unknown()),
  updateSource: z.enum(['manual', 'system', 'admin']),
  updateComment: z.string().max(1000).optional(),
});
export type UpdateRecordDto = z.infer<typeof updateRecordSchema>;

export const tableParamSchema = z.object({
  table: z.enum(healthTableNames),
  id: z.string().uuid(),
});

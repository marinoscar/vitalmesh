import { z } from 'zod';
import { syncSourceSchema } from './sync-metrics.dto';

const syncExerciseSessionSchema = z.object({
  exerciseType: z.string().min(1).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  title: z.string().max(255).optional(),
  isPlanned: z.boolean().optional(),
  attributes: z.record(z.unknown()).default({}),
  source: z.string().max(255).optional(),
  clientRecordId: z.string().max(255).optional(),
  zoneOffset: z.string().max(10).optional(),
  endZoneOffset: z.string().max(10).optional(),
  dataOrigin: z.string().max(255).optional(),
  recordingMethod: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
});

export const syncExerciseSchema = z.object({
  source: syncSourceSchema,
  sessions: z.array(syncExerciseSessionSchema).min(1).max(100),
});

export type SyncExerciseSessionDto = z.infer<typeof syncExerciseSessionSchema>;
export type SyncExerciseDto = z.infer<typeof syncExerciseSchema>;

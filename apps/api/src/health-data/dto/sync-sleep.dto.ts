import { z } from 'zod';
import { syncSourceSchema } from './sync-metrics.dto';

const sleepStageSchema = z.object({
  stage: z.enum([
    'unknown',
    'awake',
    'sleeping',
    'out_of_bed',
    'awake_in_bed',
    'light',
    'deep',
    'rem',
  ]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const syncSleepSessionSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMs: z.number().int().positive().optional(),
  title: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  stages: z.array(sleepStageSchema).optional(),
  source: z.string().max(255).optional(),
  clientRecordId: z.string().max(255).optional(),
  zoneOffset: z.string().max(10).optional(),
  endZoneOffset: z.string().max(10).optional(),
  dataOrigin: z.string().max(255).optional(),
  recordingMethod: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const syncSleepSchema = z.object({
  source: syncSourceSchema,
  sessions: z.array(syncSleepSessionSchema).min(1).max(100),
});

export type SleepStageDto = z.infer<typeof sleepStageSchema>;
export type SyncSleepSessionDto = z.infer<typeof syncSleepSessionSchema>;
export type SyncSleepDto = z.infer<typeof syncSleepSchema>;

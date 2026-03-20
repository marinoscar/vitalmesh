import { z } from 'zod';
import { syncSourceSchema } from './sync-metrics.dto';

const syncCycleEventSchema = z.object({
  eventType: z.enum([
    'menstruation_flow',
    'menstruation_period',
    'ovulation_test',
    'cervical_mucus',
    'intermenstrual_bleeding',
    'sexual_activity',
  ]),
  timestamp: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  data: z.record(z.unknown()).default({}),
  source: z.string().max(255).optional(),
  clientRecordId: z.string().max(255).optional(),
  zoneOffset: z.string().max(10).optional(),
  endZoneOffset: z.string().max(10).optional(),
  dataOrigin: z.string().max(255).optional(),
  recordingMethod: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const syncCycleSchema = z.object({
  source: syncSourceSchema,
  events: z.array(syncCycleEventSchema).min(1).max(100),
});

export type SyncCycleEventDto = z.infer<typeof syncCycleEventSchema>;
export type SyncCycleDto = z.infer<typeof syncCycleSchema>;

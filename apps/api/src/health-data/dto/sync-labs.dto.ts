import { z } from 'zod';
import { syncSourceSchema } from './sync-metrics.dto';

const syncLabResultSchema = z.object({
  testName: z.string().min(1).max(200),
  value: z.number(),
  unit: z.string().min(1).max(50),
  timestamp: z.string().datetime(),
  rangeLow: z.number().optional(),
  rangeHigh: z.number().optional(),
  status: z
    .enum(['normal', 'low', 'high', 'critical_low', 'critical_high'])
    .optional(),
  panelName: z.string().max(200).optional(),
  labName: z.string().max(255).optional(),
  orderingProvider: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(255).optional(),
  tags: z.record(z.unknown()).optional(),
});

export const syncLabsSchema = z.object({
  source: syncSourceSchema,
  results: z.array(syncLabResultSchema).min(1).max(100),
});

export type SyncLabResultDto = z.infer<typeof syncLabResultSchema>;
export type SyncLabsDto = z.infer<typeof syncLabsSchema>;

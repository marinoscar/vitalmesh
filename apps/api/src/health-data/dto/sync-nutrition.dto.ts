import { z } from 'zod';
import { syncSourceSchema } from './sync-metrics.dto';

const syncNutritionItemSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  mealType: z
    .enum(['breakfast', 'lunch', 'dinner', 'snack', 'unknown'])
    .optional(),
  name: z.string().max(500).optional(),
  nutrients: z.record(z.number()).default({}),
  source: z.string().max(255).optional(),
  clientRecordId: z.string().max(255).optional(),
  zoneOffset: z.string().max(10).optional(),
  endZoneOffset: z.string().max(10).optional(),
  dataOrigin: z.string().max(255).optional(),
  recordingMethod: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const syncNutritionSchema = z.object({
  source: syncSourceSchema,
  entries: z.array(syncNutritionItemSchema).min(1).max(100),
});

export type SyncNutritionItemDto = z.infer<typeof syncNutritionItemSchema>;
export type SyncNutritionDto = z.infer<typeof syncNutritionSchema>;

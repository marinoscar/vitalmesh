import { z } from 'zod';

export const createMoodScaleSchema = z.object({
  scaleName: z.string().min(1).max(100),
  minValue: z.number().int(),
  maxValue: z.number().int(),
  labels: z.record(z.string()),
  icon: z.string().max(50).optional(),
});
export type CreateMoodScaleDto = z.infer<typeof createMoodScaleSchema>;

export const updateMoodScaleSchema = z.object({
  labels: z.record(z.string()).optional(),
  minValue: z.number().int().optional(),
  maxValue: z.number().int().optional(),
  icon: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateMoodScaleDto = z.infer<typeof updateMoodScaleSchema>;

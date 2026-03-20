import { z } from 'zod';

const syncStateItemSchema = z.object({
  dataType: z.string().min(1).max(100),
  changeToken: z.string().max(1000).optional().nullable(),
  lastSyncAt: z.string().datetime().optional().nullable(),
  lastRecordTime: z.string().datetime().optional().nullable(),
  recordsSynced: z.number().int().nonnegative().optional(),
  syncStatus: z.enum(['idle', 'syncing', 'error']).optional(),
  errorMessage: z.string().max(2000).optional().nullable(),
});

export const updateSyncStateSchema = z.object({
  deviceId: z.string().uuid(),
  states: z.array(syncStateItemSchema).min(1).max(50),
});

export const getSyncStateQuerySchema = z.object({
  deviceId: z.string().uuid().optional(),
});

export type SyncStateItemDto = z.infer<typeof syncStateItemSchema>;
export type UpdateSyncStateDto = z.infer<typeof updateSyncStateSchema>;
export type GetSyncStateQueryDto = z.infer<typeof getSyncStateQuerySchema>;

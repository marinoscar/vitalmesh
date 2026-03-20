import { z } from 'zod';

export const syncSourceSchema = z.object({
  deviceName: z.string().min(1).max(255),
  deviceModel: z.string().max(255).optional(),
  deviceManufacturer: z.string().max(255).optional(),
  deviceOs: z.string().max(100).optional(),
  deviceType: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
  appPackage: z.string().max(255).optional(),
});

export const syncMetricItemSchema = z.object({
  metric: z.string().min(1).max(100),
  value: z.number(),
  unit: z.string().min(1).max(50),
  timestamp: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  source: z.string().max(255).optional(),
  groupId: z.string().uuid().optional(),
  tags: z.record(z.unknown()).optional(),
  clientRecordId: z.string().max(255).optional(),
  zoneOffset: z.string().max(10).optional(),
  endZoneOffset: z.string().max(10).optional(),
  dataOrigin: z.string().max(255).optional(),
  recordingMethod: z.string().max(50).optional(),
  deviceType: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
  notes: z.string().max(2000).optional(),
});

export const syncMetricsSchema = z.object({
  source: syncSourceSchema,
  metrics: z.array(syncMetricItemSchema).min(1).max(500),
});

export type SyncSourceDto = z.infer<typeof syncSourceSchema>;
export type SyncMetricItemDto = z.infer<typeof syncMetricItemSchema>;
export type SyncMetricsDto = z.infer<typeof syncMetricsSchema>;

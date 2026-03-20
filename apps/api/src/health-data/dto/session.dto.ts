import { z } from 'zod';

export const createSessionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  tags: z.record(z.unknown()).optional(),
});
export type CreateSessionDto = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  tags: z.record(z.unknown()).optional().nullable(),
});
export type UpdateSessionDto = z.infer<typeof updateSessionSchema>;

export const sessionRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        tableName: z.string().min(1),
        recordId: z.string().uuid(),
      }),
    )
    .min(1)
    .max(100),
});
export type SessionRecordsDto = z.infer<typeof sessionRecordsSchema>;

export const sessionsQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'archived']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type SessionsQueryDto = z.infer<typeof sessionsQuerySchema>;

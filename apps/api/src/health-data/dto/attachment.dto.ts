import { z } from 'zod';

export const createAttachmentSchema = z.object({
  storageObjectId: z.string().uuid(),
  caption: z.string().max(500).optional(),
  sortOrder: z.number().int().default(0),
});
export type CreateAttachmentDto = z.infer<typeof createAttachmentSchema>;

import { z } from 'zod';

export const updateDeviceSchema = z.object({
  deviceName: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateDeviceDto = z.infer<typeof updateDeviceSchema>;

import { z } from 'zod';

export const createCommentSchema = z.object({
  comment: z.string().min(1).max(5000),
  commentType: z.enum(['note', 'doctor_note', 'coach_feedback']).default('note'),
});
export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  comment: z.string().min(1).max(5000),
});
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;

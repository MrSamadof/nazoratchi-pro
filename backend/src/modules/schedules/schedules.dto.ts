import { z } from 'zod';
import { SHIFT_TYPES } from '../../core/config/constants.js';

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Noto'g'ri ID");
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana yyyy-MM-dd formatida bo'lishi kerak");

export const setShiftDto = z.object({
  userId: objectIdSchema,
  storeId: objectIdSchema,
  date: dateStringSchema,
  shiftType: z.enum(SHIFT_TYPES),
  note: z.string().trim().max(200).optional(),
});
export type SetShiftDto = z.infer<typeof setShiftDto>;

export const swapShiftDto = z.object({
  userA: objectIdSchema,
  userB: objectIdSchema,
  date: dateStringSchema,
});
export type SwapShiftDto = z.infer<typeof swapShiftDto>;

export const weekQueryDto = z.object({
  storeId: objectIdSchema,
  weekStart: dateStringSchema,
});
export type WeekQueryDto = z.infer<typeof weekQueryDto>;

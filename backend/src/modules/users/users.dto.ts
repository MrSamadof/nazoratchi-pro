import { z } from 'zod';
import { USER_ROLES } from './users.model.js';
import { DIVISIONS, SHIFT_TYPES } from '../../core/config/constants.js';

const phoneSchema = z
  .string()
  .trim()
  .min(9, "Telefon raqam kamida 9 raqamdan iborat bo'lishi kerak")
  .max(20, 'Telefon raqam juda uzun')
  .regex(/^\d+$/, "Telefon raqam faqat raqamlardan iborat bo'lishi kerak");

const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN 4 raqamdan iborat bo'lishi kerak");

const objectIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, "Noto'g'ri ID");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt HH:mm formatda bo'lishi kerak");

export const createUserDto = z
  .object({
    firstName: z.string().trim().min(2, "Ism kamida 2 belgi bo'lishi kerak").max(50),
    lastName: z.string().trim().max(50).optional().default(''),
    phone: phoneSchema,
    password: pinSchema,
    role: z.enum(USER_ROLES).default('employee'),
    storeId: objectIdSchema.nullable().optional(),
    division: z.enum(DIVISIONS).nullable().optional(),
    defaultShiftType: z.enum(SHIFT_TYPES).nullable().optional(),
    defaultShiftStartTime: timeSchema.nullable().optional(),
    defaultShiftEndTime: timeSchema.nullable().optional(),
    isApproved: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.defaultShiftType === 'custom') {
      if (!v.defaultShiftStartTime || !v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Qo'lda smena uchun boshlanish va tugash vaqti kerak",
          path: ['defaultShiftStartTime'],
        });
      } else if (v.defaultShiftStartTime >= v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Boshlanish vaqti tugashdan oldin bo'lishi kerak",
          path: ['defaultShiftStartTime'],
        });
      }
    }
  });
export type CreateUserDto = z.infer<typeof createUserDto>;

export const updateUserDto = z
  .object({
    firstName: z.string().trim().min(2).max(50),
    lastName: z.string().trim().max(50),
    phone: phoneSchema,
    role: z.enum(USER_ROLES),
    storeId: objectIdSchema.nullable(),
    division: z.enum(DIVISIONS).nullable(),
    defaultShiftType: z.enum(SHIFT_TYPES).nullable(),
    defaultShiftStartTime: timeSchema.nullable(),
    defaultShiftEndTime: timeSchema.nullable(),
    isApproved: z.boolean(),
    isActive: z.boolean(),
  })
  .partial()
  .superRefine((v, ctx) => {
    if (v.defaultShiftType === 'custom') {
      if (!v.defaultShiftStartTime || !v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Qo'lda smena uchun boshlanish va tugash vaqti kerak",
          path: ['defaultShiftStartTime'],
        });
      } else if (v.defaultShiftStartTime >= v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Boshlanish vaqti tugashdan oldin bo'lishi kerak",
          path: ['defaultShiftStartTime'],
        });
      }
    }
  });
export type UpdateUserDto = z.infer<typeof updateUserDto>;

export const resetPinDto = z.object({
  password: pinSchema,
});
export type ResetPinDto = z.infer<typeof resetPinDto>;

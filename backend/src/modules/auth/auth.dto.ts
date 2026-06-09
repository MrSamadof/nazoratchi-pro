import { z } from 'zod';

const phoneSchema = z
  .string()
  .trim()
  .min(9, 'Telefon raqam kamida 9 raqamdan iborat bo\'lishi kerak')
  .max(20, 'Telefon raqam juda uzun')
  .regex(/^\d+$/, 'Telefon raqam faqat raqamlardan iborat bo\'lishi kerak');

const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN 4 raqamdan iborat bo\'lishi kerak')
  .max(6);

export const registerDto = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'Ism kamida 2 belgi bo\'lishi kerak')
    .max(50, 'Ism juda uzun'),
  lastName: z.string().trim().max(50, 'Familiya juda uzun').optional().default(''),
  phone: phoneSchema,
  password: pinSchema,
  storeId: z.string().min(1, 'Do\'kon tanlanmagan'),
});
export type RegisterDto = z.infer<typeof registerDto>;

export const loginDto = z.object({
  phone: phoneSchema,
  password: pinSchema,
});
export type LoginDto = z.infer<typeof loginDto>;

import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Noto'g'ri ID");

/**
 * Rag'bat so'rovi/berish.
 * - Xodim `recipientId` (boshqa xodim, o'zi emas) + `reason` yuboradi — miqdorni
 *   tasdiqlovchi belgilaydi (shuning uchun `amount` ixtiyoriy).
 * - Rahbar/CEO xodimga berganda `recipientId` va `amount` ko'rsatadi.
 * Recipient/amount majburiyligi role'ga qarab route'da tekshiriladi.
 */
export const createRewardDto = z.object({
  recipientId: objectIdSchema.optional(),
  amount: z.coerce.number().int().min(1000, "Summa kamida 1000 so'm").max(100_000_000).optional(),
  reason: z.string().trim().min(3, 'Sabab kamida 3 belgi').max(500),
});
export type CreateRewardDto = z.infer<typeof createRewardDto>;

export const decideRewardDto = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(500).optional().default(''),
  // Tasdiqlashda miqdorni belgilash (xodim o'ziga so'ragan, miqdorsiz so'rovlar uchun).
  amount: z.coerce.number().int().min(1000, "Summa kamida 1000 so'm").max(100_000_000).optional(),
});
export type DecideRewardDto = z.infer<typeof decideRewardDto>;

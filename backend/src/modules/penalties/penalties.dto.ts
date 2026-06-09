import { z } from 'zod';
import { PENALTY_TYPES } from './penalties.model.js';

/**
 * Jarima qoidasi yaratish/yangilash uchun validatsiya.
 * - `maxMinutes` null bo'lsa "yuqori chegara yo'q" (masalan "30+ daqiqa").
 * - `absence` (kelmaslik) turida daqiqa oralig'i hisobga olinmaydi.
 */
export const createPenaltyRuleDto = z.object({
  name: z.string().trim().min(2, 'Nom kamida 2 belgi').max(80),
  type: z.enum(PENALTY_TYPES),
  minMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  maxMinutes: z.coerce.number().int().min(1).max(1440).nullable().default(null),
  amount: z.coerce.number().int().min(0, 'Summa manfiy bo\'lolmaydi').max(100_000_000),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(300).optional().default(''),
});
export type CreatePenaltyRuleDto = z.infer<typeof createPenaltyRuleDto>;

export const updatePenaltyRuleDto = createPenaltyRuleDto.partial();
export type UpdatePenaltyRuleDto = z.infer<typeof updatePenaltyRuleDto>;

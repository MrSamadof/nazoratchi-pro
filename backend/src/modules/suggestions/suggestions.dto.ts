import { z } from 'zod';
import { SUGGESTION_STATUS } from './suggestions.model.js';

/**
 * Taklif yaratish — xodim sarlavha (ixtiyoriy) + matn yuboradi, anonim bo'lishi mumkin.
 */
export const createSuggestionDto = z.object({
  title: z.string().trim().max(120).optional().default(''),
  text: z.string().trim().min(10, 'Taklif kamida 10 belgi').max(4000),
  isAnonymous: z.coerce.boolean().optional().default(false),
});
export type CreateSuggestionDto = z.infer<typeof createSuggestionDto>;

/**
 * CEO qarori — holatni o'zgartirish + ixtiyoriy javob.
 */
export const decideSuggestionDto = z.object({
  status: z.enum(SUGGESTION_STATUS),
  response: z.string().trim().max(2000).optional().default(''),
});
export type DecideSuggestionDto = z.infer<typeof decideSuggestionDto>;

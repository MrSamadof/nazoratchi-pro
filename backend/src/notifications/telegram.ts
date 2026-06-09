import { Api } from 'grammy';
import { logger } from '../core/logger/logger.js';
import { authService } from '../modules/auth/auth.service.js';
import { usersService } from '../modules/users/users.service.js';
import { appSettingsService } from '../modules/app-settings/app-settings.service.js';

/**
 * Telegram outgoing API — faqat xabar yuborish uchun.
 * Polling/webhook yo'q. Bu modul `worker` jarayoni va Next.js API route lari ishlatadi.
 *
 * Bot token CEO sozlamalarida (DB) saqlanadi. Token o'rnatilmagan bo'lsa, hech
 * narsa yubormaydi (silent no-op). Token o'zgarsa, Api avtomatik qayta quriladi.
 */

let cachedApi: { token: string; api: Api } | null = null;
async function getApi(): Promise<Api | null> {
  const { telegramBotToken } = await appSettingsService.get();
  if (!telegramBotToken) return null;
  if (!cachedApi || cachedApi.token !== telegramBotToken) {
    cachedApi = { token: telegramBotToken, api: new Api(telegramBotToken) };
  }
  return cachedApi.api;
}

export async function isTelegramEnabled(): Promise<boolean> {
  return appSettingsService.isTelegramConfigured();
}

/**
 * Bot username'ini qaytaradi (@'siz). Sozlamalarda keshlangan bo'lsa shuni,
 * bo'lmasa `getMe()` orqali aniqlab DB ga keshlaydi. Bot o'chirilgan bo'lsa null.
 */
export async function getBotUsername(): Promise<string | null> {
  const s = await appSettingsService.get();
  if (s.telegramBotUsername) return s.telegramBotUsername;
  const tg = await getApi();
  if (!tg) return null;
  try {
    const me = await tg.getMe();
    const username = me.username ?? null;
    if (username) await appSettingsService.setTelegramUsername(username);
    return username;
  } catch (err) {
    logger.warn({ err }, 'Telegram getMe() xato — username aniqlanmadi');
    return null;
  }
}

/**
 * Bitta foydalanuvchiga xabar yuboradi (Telegram ID bo'lsa).
 */
export async function notifyUser(
  telegramId: number | null | undefined,
  text: string,
  options?: { parseMode?: 'Markdown' | 'HTML' },
): Promise<void> {
  const tg = await getApi();
  if (!tg || !telegramId) return;
  try {
    await tg.sendMessage(telegramId, text, {
      parse_mode: options?.parseMode ?? 'Markdown',
    });
  } catch (err) {
    logger.warn({ err, telegramId }, 'Telegram xabar yuborilmadi');
  }
}

/**
 * Barcha CEO larga xabar yuboradi.
 */
export async function notifyCEOs(
  text: string,
  options?: { parseMode?: 'Markdown' | 'HTML' },
): Promise<void> {
  const tg = await getApi();
  if (!tg) return;
  const ceos = await authService.findCEOs();
  for (const c of ceos) {
    await notifyUser(c.telegramId, text, options);
  }
}

/**
 * Boshqaruv guruhiga (menejer + CEO) xabar yuboradi.
 * Kunlik/haftalik hisobotlar shu funksiyani ishlatadi.
 */
export async function notifyManagers(
  text: string,
  options?: { parseMode?: 'Markdown' | 'HTML' },
): Promise<{ sent: number; skipped: number }> {
  const tg = await getApi();
  if (!tg) return { sent: 0, skipped: 0 };
  const managers = await usersService.findManagers();
  let sent = 0;
  let skipped = 0;
  for (const m of managers) {
    if (!m.telegramId) {
      skipped++;
      continue;
    }
    await notifyUser(m.telegramId, text, options);
    sent++;
  }
  return { sent, skipped };
}

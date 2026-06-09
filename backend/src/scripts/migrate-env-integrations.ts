/**
 * Bir martalik migratsiya — eski `.env` dagi integratsiya kalitlarini
 * (GEMINI_API_KEY, GEMINI_MODEL, BOT_TOKEN) DB ga (shifrlab) ko'chiradi.
 *
 * Integratsiyalar env'dan DB ga ko'chgandan keyin, eski deploylar uzilmasligi
 * uchun ishlatiladi. Idempotent — DB da allaqachon sozlangan kalitga tegmaydi.
 *
 * Ishga tushirish (konteyner ichida): `npx tsx src/scripts/migrate-env-integrations.ts`
 */

import '../core/config/load-env.js';
import { connectDatabase, disconnectDatabase } from '../core/database/connection.js';
import { appSettingsService } from '../modules/app-settings/app-settings.service.js';
import { logger } from '../core/logger/logger.js';

async function main(): Promise<void> {
  await connectDatabase();
  try {
    const current = await appSettingsService.getMasked();
    const patch: { geminiApiKey?: string; geminiModel?: string; telegramBotToken?: string } = {};

    const envGemini = process.env.GEMINI_API_KEY?.trim();
    const envModel = process.env.GEMINI_MODEL?.trim();
    const envBot = process.env.BOT_TOKEN?.trim();

    if (envGemini && !current.geminiConfigured) {
      patch.geminiApiKey = envGemini;
      if (envModel) patch.geminiModel = envModel;
      logger.info('Gemini kaliti env dan DB ga ko‘chiriladi');
    } else if (current.geminiConfigured) {
      logger.info('Gemini allaqachon DB da sozlangan — o‘tkazib yuborildi');
    } else {
      logger.info('env da GEMINI_API_KEY yo‘q — Gemini ko‘chirilmadi');
    }

    if (envBot && !current.telegramConfigured) {
      patch.telegramBotToken = envBot;
      logger.info('Telegram tokeni env dan DB ga ko‘chiriladi');
    } else if (current.telegramConfigured) {
      logger.info('Telegram allaqachon DB da sozlangan — o‘tkazib yuborildi');
    } else {
      logger.info('env da BOT_TOKEN yo‘q — Telegram ko‘chirilmadi');
    }

    if (Object.keys(patch).length > 0) {
      const result = await appSettingsService.update(patch);
      logger.info(
        { gemini: result.geminiConfigured, telegram: result.telegramConfigured },
        '✅ Migratsiya tugadi',
      );
    } else {
      logger.info('Hech narsa ko‘chirilmadi (yangilanish shart emas)');
    }
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'Migratsiya xato bilan tugadi');
  process.exit(1);
});

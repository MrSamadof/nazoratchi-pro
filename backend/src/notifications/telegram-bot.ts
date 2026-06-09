import { Bot } from 'grammy';
import { logger } from '../core/logger/logger.js';
import { telegramLinkService, TelegramLinkError } from '../modules/telegram/telegram-link.service.js';
import { appSettingsService } from '../modules/app-settings/app-settings.service.js';

/**
 * Telegram bot — INCOMING listener (long-polling).
 *
 * Yagona vazifasi: `/start <token>` deep-link orqali kelgan tokenni qabul qilib,
 * foydalanuvchining `telegramId`'sini bog'lash. Boshqa hech narsa qilmaydi.
 *
 * MUHIM: faqat bitta jarayon polling qilishi mumkin — shuning uchun bu faqat
 * `worker` jarayonida ishga tushadi (web emas).
 */

let bot: Bot | null = null;

export async function startTelegramBot(): Promise<void> {
  const { telegramBotToken } = await appSettingsService.get();
  if (!telegramBotToken) {
    logger.info('Telegram bot listener o\'chirilgan (token sozlanmagan — CEO panelidan qo\'shing)');
    return;
  }
  if (bot) return;

  bot = new Bot(telegramBotToken);

  bot.command('start', async (ctx) => {
    const token = (ctx.match ?? '').trim();
    const telegramId = ctx.from?.id;

    if (!telegramId) return;

    if (!token) {
      await ctx.reply(
        'Salom! 👋\n\nAkkauntingizni bog\'lash uchun Nazoratchi AI ilovasidagi ' +
          '*Profil → Telegram\'ni ulash* tugmasini bosing va chiqgan havola orqali keling.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    try {
      const user = await telegramLinkService.consumeToken(
        token,
        telegramId,
        ctx.from?.username ?? null,
      );
      await ctx.reply(
        `✅ Tayyor, ${user.firstName}!\n\nTelegram akkauntingiz bog\'landi. ` +
          'Endi hisobotlar va eslatmalar shu yerga keladi.',
      );
    } catch (err) {
      if (err instanceof TelegramLinkError) {
        const msg =
          err.code === 'EXPIRED'
            ? '⏱ Havola muddati tugagan. Ilovadan yangi havola oling.'
            : err.code === 'ALREADY_LINKED_OTHER'
              ? '⚠️ Bu Telegram akkaunt boshqa foydalanuvchiga bog\'langan.'
              : '❌ Havola yaroqsiz yoki allaqachon ishlatilgan. Ilovadan yangi havola oling.';
        await ctx.reply(msg);
        return;
      }
      logger.error({ err }, 'Telegram /start ishlovida xato');
      await ctx.reply('Texnik xato yuz berdi. Birozdan keyin qayta urinib ko\'ring.');
    }
  });

  bot.catch((err) => {
    logger.error({ err: err.error }, 'Telegram bot listener xatosi');
  });

  // Long-polling — to'xtatilguncha ishlaydi. bootstrap'ni bloklamaslik uchun await yo'q.
  void bot.start({
    onStart: (info) => logger.info({ username: info.username }, 'Telegram bot listener ishga tushdi'),
  });
}

export async function stopTelegramBot(): Promise<void> {
  if (bot) {
    await bot.stop();
    bot = null;
  }
}

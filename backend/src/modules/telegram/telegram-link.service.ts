import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { User, type UserDoc } from '../users/users.model.js';
import { TELEGRAM_LINK } from '../../core/config/constants.js';
import { isTelegramEnabled, getBotUsername } from '../../notifications/telegram.js';
import { logger } from '../../core/logger/logger.js';

export class TelegramLinkError extends Error {
  constructor(
    public readonly code:
      | 'BOT_DISABLED'
      | 'USER_NOT_FOUND'
      | 'INVALID_TOKEN'
      | 'EXPIRED'
      | 'ALREADY_LINKED_OTHER',
    message: string,
  ) {
    super(message);
    this.name = 'TelegramLinkError';
  }
}

export interface LinkTokenResult {
  token: string;
  expiresAt: Date;
  /** t.me deep-link — null bo'lsa bot username aniqlanmadi (token baribir ishlaydi). */
  deepLink: string | null;
}

export interface TelegramStatus {
  linked: boolean;
  telegramUsername: string | null;
  botEnabled: boolean;
}

export class TelegramLinkService {
  /**
   * Foydalanuvchi uchun bir martalik bog'lash tokeni yaratadi va deep-link qaytaradi.
   * Avvalgi token (agar bo'lsa) bekor qilinadi.
   */
  async createLinkToken(userId: Types.ObjectId | string): Promise<LinkTokenResult> {
    if (!(await isTelegramEnabled())) {
      throw new TelegramLinkError('BOT_DISABLED', "Telegram bot sozlanmagan");
    }

    const token = randomBytes(TELEGRAM_LINK.TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + TELEGRAM_LINK.EXPIRES_MINUTES * 60_000);

    const updated = await User.findByIdAndUpdate(
      userId,
      { telegramLinkToken: token, telegramLinkExpiresAt: expiresAt },
      { new: true },
    );
    if (!updated) {
      throw new TelegramLinkError('USER_NOT_FOUND', 'Foydalanuvchi topilmadi');
    }

    const username = await getBotUsername();
    const deepLink = username ? `https://t.me/${username}?start=${token}` : null;

    return { token, expiresAt, deepLink };
  }

  /**
   * Bot listener chaqiradi: token bo'yicha userni topib, telegramId'ni bog'laydi.
   * Bitta Telegram akkaunt faqat bitta userga bog'lanadi.
   */
  async consumeToken(
    token: string,
    telegramId: number,
    telegramUsername?: string | null,
  ): Promise<UserDoc> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new TelegramLinkError('INVALID_TOKEN', "Token noto'g'ri");
    }

    const user = await User.findOne({ telegramLinkToken: cleanToken });
    if (!user) {
      throw new TelegramLinkError('INVALID_TOKEN', "Token topilmadi yoki allaqachon ishlatilgan");
    }
    if (!user.telegramLinkExpiresAt || user.telegramLinkExpiresAt.getTime() < Date.now()) {
      // Eskirgan tokenni tozalaymiz.
      user.telegramLinkToken = null;
      user.telegramLinkExpiresAt = null;
      await user.save();
      throw new TelegramLinkError('EXPIRED', 'Token muddati tugagan');
    }

    // Bu Telegram akkaunt boshqa userga bog'langan bo'lsa — o'g'irlamaymiz.
    const owner = await User.findOne({ telegramId, _id: { $ne: user._id } });
    if (owner) {
      throw new TelegramLinkError(
        'ALREADY_LINKED_OTHER',
        'Bu Telegram akkaunt boshqa foydalanuvchiga bog\'langan',
      );
    }

    user.telegramId = telegramId;
    user.telegramUsername = telegramUsername ?? null;
    user.telegramLinkToken = null;
    user.telegramLinkExpiresAt = null;
    await user.save();

    logger.info(
      { userId: String(user._id), telegramId },
      'Telegram akkaunt bog\'landi',
    );
    return user;
  }

  async getStatus(userId: Types.ObjectId | string): Promise<TelegramStatus> {
    const user = await User.findById(userId).select('telegramId telegramUsername');
    return {
      linked: !!user?.telegramId,
      telegramUsername: user?.telegramUsername ?? null,
      botEnabled: await isTelegramEnabled(),
    };
  }

  async unlink(userId: Types.ObjectId | string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      telegramId: null,
      telegramUsername: null,
      telegramLinkToken: null,
      telegramLinkExpiresAt: null,
    });
    logger.info({ userId: String(userId) }, 'Telegram akkaunt uzildi');
  }
}

export const telegramLinkService = new TelegramLinkService();

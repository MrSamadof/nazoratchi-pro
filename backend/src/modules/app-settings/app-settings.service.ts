import type { Types } from 'mongoose';
import { AppSettings, type AppSettingsDoc } from './app-settings.model.js';
import { encryptSecret, decryptSecret, maskSecret } from '../../core/utils/secret-crypto.js';
import { logger } from '../../core/logger/logger.js';
import { SHIFTS, SHIFT_TEMPLATE_KEYS, type ShiftTemplateKey } from '../../core/config/constants.js';

export interface DecryptedSettings {
  geminiApiKey: string | null;
  geminiModel: string;
  telegramBotToken: string | null;
  telegramBotUsername: string | null;
  billzSecretToken: string | null;
}

/** UI uchun — maxfiy qiymatlar niqoblangan, faqat sozlangan/yo'qligi ko'rinadi. */
export interface MaskedSettings {
  geminiConfigured: boolean;
  geminiApiKeyMasked: string | null;
  geminiModel: string;
  telegramConfigured: boolean;
  telegramBotTokenMasked: string | null;
  telegramBotUsername: string | null;
  billzConfigured: boolean;
  billzSecretTokenMasked: string | null;
}

export interface ShiftTemplate {
  label: string;
  startTime: string | null;
  endTime: string | null;
}
export type ShiftTemplates = Record<ShiftTemplateKey, ShiftTemplate>;
export type ShiftTemplatesPatch = Partial<Record<ShiftTemplateKey, Partial<ShiftTemplate>>>;

export interface UpdateSettingsInput {
  // undefined — o'zgartirilmaydi; '' (bo'sh) — o'chiriladi; satr — yangilanadi.
  geminiApiKey?: string;
  geminiModel?: string;
  telegramBotToken?: string;
  billzSecretToken?: string;
  updatedBy?: Types.ObjectId | string | null;
}

const CACHE_TTL_MS = 15_000;

export class AppSettingsService {
  private cache: { value: DecryptedSettings; at: number } | null = null;
  private shiftsCache: { value: ShiftTemplates; at: number } | null = null;

  /**
   * Yagona hujjatni oladi, bo'lmasa atomik yaratadi (upsert) — parallel
   * so'rovlarda E11000 (duplicate key) bo'lmasligi uchun.
   */
  private async getDoc(): Promise<AppSettingsDoc> {
    try {
      return await AppSettings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      // Juda kam holatda ikki upsert poyga bo'lib E11000 berishi mumkin — qayta o'qiymiz.
      if ((err as { code?: number }).code === 11000) {
        const doc = await AppSettings.findOne({ key: 'global' });
        if (doc) return doc;
      }
      throw err;
    }
  }

  private decryptDoc(doc: AppSettingsDoc): DecryptedSettings {
    const safeDecrypt = (enc: string | null | undefined): string | null => {
      if (!enc) return null;
      try {
        return decryptSecret(enc);
      } catch (err) {
        // Master kalit o'zgargan yoki yozuv buzilgan — kalitni "yo'q" deb hisoblaymiz.
        logger.error({ err }, 'Integratsiya kalitini ochib bo‘lmadi (master kalit o‘zgarganmi?)');
        return null;
      }
    };
    return {
      geminiApiKey: safeDecrypt(doc.geminiApiKeyEnc),
      geminiModel: doc.geminiModel || 'gemini-2.5-flash',
      telegramBotToken: safeDecrypt(doc.telegramBotTokenEnc),
      telegramBotUsername: doc.telegramBotUsername ?? null,
      billzSecretToken: safeDecrypt(doc.billzSecretTokenEnc),
    };
  }

  /** Ochilgan sozlamalar — qisqa TTL kesh bilan (web/worker jarayonlari uchun). */
  async get(): Promise<DecryptedSettings> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) {
      return this.cache.value;
    }
    const doc = await this.getDoc();
    const value = this.decryptDoc(doc);
    this.cache = { value, at: now };
    return value;
  }

  /** Keshni majburan tozalash (yangilangandan keyin). */
  invalidate(): void {
    this.cache = null;
    this.shiftsCache = null;
  }

  /** Smena shablonlari — bazadan, bo'sh bo'lsa constants.SHIFTS default. Qisqa TTL kesh. */
  async getShiftsConfig(): Promise<ShiftTemplates> {
    const now = Date.now();
    if (this.shiftsCache && now - this.shiftsCache.at < CACHE_TTL_MS) {
      return this.shiftsCache.value;
    }
    const doc = await this.getDoc();
    const stored = (doc.shifts ?? {}) as Partial<
      Record<ShiftTemplateKey, Partial<ShiftTemplate>>
    >;
    const build = (key: ShiftTemplateKey): ShiftTemplate => ({
      label: stored[key]?.label || SHIFTS[key].label,
      startTime: stored[key]?.startTime ?? SHIFTS[key].startTime,
      endTime: stored[key]?.endTime ?? SHIFTS[key].endTime,
    });
    const value = {
      morning: build('morning'),
      evening: build('evening'),
      flexible: build('flexible'),
    } as ShiftTemplates;
    this.shiftsCache = { value, at: now };
    return value;
  }

  /** Smena shablonlarini yangilash (faqat berilgan kalitlar). */
  async updateShiftsConfig(
    patch: ShiftTemplatesPatch,
    updatedBy: Types.ObjectId | string | null,
  ): Promise<ShiftTemplates> {
    const doc = await this.getDoc();
    const current = (doc.shifts ?? {}) as Record<string, ShiftTemplate>;
    const next: Record<string, ShiftTemplate> = { ...current };
    for (const key of SHIFT_TEMPLATE_KEYS) {
      const p = patch[key];
      if (!p) continue;
      next[key] = {
        label: p.label ?? SHIFTS[key].label,
        startTime: p.startTime ?? null,
        endTime: p.endTime ?? null,
      };
    }
    doc.set('shifts', next);
    if (updatedBy !== undefined) {
      doc.updatedBy = (updatedBy as Types.ObjectId) ?? null;
    }
    await doc.save();
    this.shiftsCache = null;
    return this.getShiftsConfig();
  }

  async getMasked(): Promise<MaskedSettings> {
    const s = await this.get();
    return {
      geminiConfigured: !!s.geminiApiKey,
      geminiApiKeyMasked: maskSecret(s.geminiApiKey),
      geminiModel: s.geminiModel,
      telegramConfigured: !!s.telegramBotToken,
      telegramBotTokenMasked: maskSecret(s.telegramBotToken),
      telegramBotUsername: s.telegramBotUsername,
      billzConfigured: !!s.billzSecretToken,
      billzSecretTokenMasked: maskSecret(s.billzSecretToken),
    };
  }

  async update(input: UpdateSettingsInput): Promise<MaskedSettings> {
    const doc = await this.getDoc();

    if (input.geminiApiKey !== undefined) {
      const v = input.geminiApiKey.trim();
      doc.geminiApiKeyEnc = v ? encryptSecret(v) : null;
    }
    if (input.geminiModel !== undefined) {
      doc.geminiModel = input.geminiModel.trim() || 'gemini-2.5-flash';
    }
    if (input.telegramBotToken !== undefined) {
      const v = input.telegramBotToken.trim();
      doc.telegramBotTokenEnc = v ? encryptSecret(v) : null;
      // Token o'zgardi — keshlangan username endi yaroqsiz.
      doc.telegramBotUsername = null;
    }
    if (input.billzSecretToken !== undefined) {
      const v = input.billzSecretToken.trim();
      doc.billzSecretTokenEnc = v ? encryptSecret(v) : null;
    }
    if (input.updatedBy !== undefined) {
      doc.updatedBy = (input.updatedBy as Types.ObjectId) ?? null;
    }

    await doc.save();
    this.invalidate();
    return this.getMasked();
  }

  /** Telegram bot username'ini keshlash (getMe() natijasi). */
  async setTelegramUsername(username: string | null): Promise<void> {
    await AppSettings.updateOne({ key: 'global' }, { $set: { telegramBotUsername: username } });
    this.invalidate();
  }

  async isGeminiConfigured(): Promise<boolean> {
    return !!(await this.get()).geminiApiKey;
  }

  async isTelegramConfigured(): Promise<boolean> {
    return !!(await this.get()).telegramBotToken;
  }

  async isBillzConfigured(): Promise<boolean> {
    return !!(await this.get()).billzSecretToken;
  }
}

export const appSettingsService = new AppSettingsService();

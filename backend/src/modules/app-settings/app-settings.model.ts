import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from 'mongoose';

/**
 * Yagona (singleton) hujjat — butun tizim integratsiya sozlamalari.
 * `key: 'global'` unique — har doim bitta yozuv bo'ladi.
 *
 * Maxfiy qiymatlar (Gemini API key, Telegram bot token) shifrlangan holda
 * saqlanadi (`*Enc` maydonlar). Model nomi (gemini) va username ochiq.
 */
const appSettingsSchema = new Schema(
  {
    key: { type: String, default: 'global', unique: true, immutable: true },

    // Gemini AI
    geminiApiKeyEnc: { type: String, default: null },
    geminiModel: { type: String, default: 'gemini-2.5-flash' },

    // Telegram bot
    telegramBotTokenEnc: { type: String, default: null },
    // getMe() orqali aniqlangan username (@'siz) — keshlanadi.
    telegramBotUsername: { type: String, default: null },

    // Billz POS — integratsiya sirli kaliti (secret_token). Undan runtime'da
    // login qilib JWT access token olinadi (login/refresh billz.service ichida).
    billzSecretTokenEnc: { type: String, default: null },

    // Smena shablonlari — soatlar bazada tahrirlanadi (constants.SHIFTS — fallback).
    // day_off va custom bu yerda yo'q (day_off doim soatsiz, custom — xodimga biriktiriladi).
    shifts: {
      type: new Schema(
        {
          morning: { label: String, startTime: String, endTime: String },
          evening: { label: String, startTime: String, endTime: String },
          flexible: { label: String, startTime: String, endTime: String },
        },
        { _id: false },
      ),
      default: null,
    },

    // Oxirgi marta kim o'zgartirgani (audit uchun)
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export type AppSettingsType = InferSchemaType<typeof appSettingsSchema>;
export type AppSettingsDoc = HydratedDocument<AppSettingsType>;
export const AppSettings =
  mongoose.models.AppSettings ?? model('AppSettings', appSettingsSchema);

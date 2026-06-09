import { z } from 'zod';

const envSchema = z.object({
  // Database
  MONGO_URI: z.string().url().or(z.string().startsWith('mongodb')),
  MONGO_DB_NAME: z.string().default('nazoratchi'),

  // Auth — sessiya cookie sirini imzolash uchun
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET kamida 32 belgi bo'lishi kerak"),
  SESSION_COOKIE_NAME: z.string().default('nz_session'),
  SESSION_EXPIRES_IN: z.string().default('7d'),
  // Cookie `Secure` flagi. Berilmasa NODE_ENV==='production' bo'yicha aniqlanadi.
  // TLS'siz (HTTP) deploy uchun "false" qiling — aks holda brauzer sessiya cookie'sini saqlamaydi.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  // Integratsiya kalitlarini (Gemini API key, Telegram bot token) DB da shifrlab
  // saqlash uchun master kalit. Bu yagona maxfiy env — kalitlarning o'zi CEO
  // panelida kiritiladi va DB da shifrlangan holda yotadi.
  SETTINGS_ENCRYPTION_KEY: z
    .string()
    .min(16, "SETTINGS_ENCRYPTION_KEY kamida 16 belgi bo'lishi kerak"),

  // ESLATMA: Gemini va Telegram kalitlari endi env orqali emas, CEO sozlamalari
  // (app-settings, DB) orqali boshqariladi. Quyidagilar faqat eski .env fayllar
  // validatsiyadan o'tishi uchun qoldirilgan — kod ularni o'qimaydi.
  BOT_TOKEN: z.string().optional(),
  BOT_USERNAME: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),

  // Billz
  BILLZ_API_URL: z.string().url().optional(),
  BILLZ_API_TOKEN: z.string().optional(),

  // Logger / runtime
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TZ: z.string().default('Asia/Tashkent'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ .env validatsiya xatosi:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Environment variables validatsiya o'tmadi");
}

export const env = parsed.data;
export type Env = typeof env;

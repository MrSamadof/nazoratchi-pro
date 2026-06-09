/**
 * Loyiha doimiy qiymatlari.
 */

export const TIMEZONE = 'Asia/Tashkent';

export const DATE_FORMAT = 'dd.MM.yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm';
export const API_DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Auth cheklovlari
 */
export const AUTH = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
  PASSWORD_MIN_LENGTH: 6,
} as const;

/**
 * Telegram bog'lash — bir martalik token orqali.
 * Web "Ulash" tugmasi token yaratadi, t.me deep-link'da botga yuboriladi,
 * worker'dagi bot listener token'ni topib telegramId'ni bog'laydi.
 */
export const TELEGRAM_LINK = {
  /** Token uzunligi (bayt) — hex'da 2x bo'ladi. */
  TOKEN_BYTES: 12,
  /** Token amal qilish muddati (daqiqa). */
  EXPIRES_MINUTES: 15,
} as const;

/**
 * Smenalar — do'konlarda ikki asosiy smena bor, plus o'zgaruvchan (flexible)
 * 10 soatlik smena va dam olish kuni.
 *  - morning  — ertalabki:  08:00 → 18:00
 *  - evening  — kechki:     13:00 → 23:00
 *  - flexible — o'zgaruvchan: belgilangan boshlanish yo'q, 10 soat ishlaydi
 *  - day_off  — dam olish kuni
 */
export const SHIFT_TYPES = ['morning', 'evening', 'flexible', 'day_off', 'custom'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const SHIFTS: Record<
  ShiftType,
  { label: string; startTime: string | null; endTime: string | null; hours: number | null }
> = {
  morning: { label: 'Ertalabki (08:00–18:00)', startTime: '08:00', endTime: '18:00', hours: 10 },
  evening: { label: 'Kechki (13:00–23:00)', startTime: '13:00', endTime: '23:00', hours: 10 },
  flexible: { label: "O'zgaruvchan (10 soat)", startTime: null, endTime: null, hours: 10 },
  day_off: { label: 'Dam olish', startTime: null, endTime: null, hours: null },
  // Qo'lda kiritiladigan smena — soat User hujjatida saqlanadi (shablon emas).
  custom: { label: "Qo'lda (maxsus)", startTime: null, endTime: null, hours: null },
};

/** Belgilangan (fixed) boshlanish/tugash vaqti bor smenalar — kech kelish/erta ketish shularga hisoblanadi. */
export const FIXED_SHIFTS: ShiftType[] = ['morning', 'evening', 'custom'];

/** Bazada (AppSettings) tahrirlanadigan shablon smenalar. */
export const SHIFT_TEMPLATE_KEYS = ['morning', 'evening', 'flexible'] as const;
export type ShiftTemplateKey = (typeof SHIFT_TEMPLATE_KEYS)[number];

/**
 * Bo'limlar — xodimlar ikki bo'limga ajraladi. Eng ko'p sotgan xodim
 * bo'lim ichida (barcha do'konlar bo'ylab) aniqlanadi.
 */
export const DIVISIONS = ['dubai_house', 'amir'] as const;
export type Division = (typeof DIVISIONS)[number];

export const DIVISION_LABELS: Record<Division, string> = {
  dubai_house: 'Dubai House',
  amir: 'Amir',
};

/**
 * Kunlik avtomatik rag'batlar (so'mda).
 *  - topStore     — eng ko'p mahsulot sotgan do'kon
 *  - topEmployee  — bo'lim ichida eng ko'p sotgan xodim
 */
export const DAILY_REWARDS = {
  topStore: 100_000,
  topEmployee: {
    dubai_house: 50_000,
    amir: 25_000,
  } as Record<Division, number>,
} as const;

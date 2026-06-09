/**
 * Pul miqdorini formatlaydi: 1500000 → "1 500 000".
 * Eski v1 standardi: probel bilan ajratish, so'm qo'shilmaydi (chaqiruvchi qo'shadi).
 */
export function formatMoney(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Daqiqalarni "1 soat 5 daqiqa" ko'rinishida formatlaydi.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} daqiqa`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} soat ${m} daqiqa` : `${h} soat`;
}

/**
 * Telefon raqamni kanonik shaklga keltiradi: barcha raqamsiz belgilar olib tashlanadi.
 * Misol: "+998 90 123 45 67" → "998901234567", "8901234567" → "8901234567".
 * Telegram contact ulashganda odatda "998901234567" formatida keladi.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

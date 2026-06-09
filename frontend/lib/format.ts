/**
 * Pul: 1500000 → "1 500 000"
 */
export function formatMoney(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];
const WEEKDAYS = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
];

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // Asia/Tashkent UTC+5

/** ISO string yoki Date dan Tashkent vaqti bo'yicha "DD.MM.YYYY" */
export function formatDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const tz = new Date(d.getTime() + TZ_OFFSET_MS);
  const day = String(tz.getUTCDate()).padStart(2, '0');
  const month = String(tz.getUTCMonth() + 1).padStart(2, '0');
  const year = tz.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

export function formatTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const tz = new Date(d.getTime() + TZ_OFFSET_MS);
  const h = String(tz.getUTCHours()).padStart(2, '0');
  const m = String(tz.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDateTime(input: string | Date): string {
  return `${formatDate(input)} ${formatTime(input)}`;
}

export function weekdayName(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const tz = new Date(d.getTime() + TZ_OFFSET_MS);
  return WEEKDAYS[tz.getUTCDay()] ?? '';
}

export function monthName(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const tz = new Date(d.getTime() + TZ_OFFSET_MS);
  return MONTHS[tz.getUTCMonth()] ?? '';
}

export function fullDateLabel(input: string | Date = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const tz = new Date(d.getTime() + TZ_OFFSET_MS);
  return `${tz.getUTCDate()} ${monthName(tz)}, ${tz.getUTCFullYear()} · ${weekdayName(tz)}`;
}

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { TIMEZONE } from '../config/constants.js';

/**
 * Hozirgi UTC sanasi (DB Date object UTC da saqlanadi).
 * Tashkent vaqtiga formatlash uchun `formatDate`/`formatTime` ishlatiladi.
 */
export function now(): Date {
  return new Date();
}

/**
 * Berilgan sananing Tashkent vaqti bo'yicha kun boshini (00:00) UTC Date sifatida qaytaradi.
 * DB da "kun" indekslash uchun ishlatiladi.
 */
export function startOfTashkentDay(date: Date = new Date()): Date {
  const dateStr = formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
  return fromZonedTime(`${dateStr}T00:00:00`, TIMEZONE);
}

/**
 * "HH:mm" formatidagi vaqtni bugungi (yoki baseDate) Tashkent kuniga moslab UTC Date qaytaradi.
 * Misol: tashkentTimeToday("09:00") → 2026-05-15 04:00:00 UTC (= 09:00 Tashkent)
 */
export function tashkentTimeToday(timeStr: string, baseDate: Date = new Date()): Date {
  const dateStr = formatInTimeZone(baseDate, TIMEZONE, 'yyyy-MM-dd');
  return fromZonedTime(`${dateStr}T${timeStr}:00`, TIMEZONE);
}

/**
 * "yyyy-MM-dd" formatidagi sana stringini Tashkent kuni boshiga (UTC Date) aylantiradi.
 * `new Date('2026-05-21')` UTC yarim tunini beradi — bu Tashkentda noto'g'ri kunga tushishi mumkin,
 * shuning uchun aniq vaqt zonasi bilan parslash kerak.
 */
export function parseTashkentDay(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, TIMEZONE);
}

export function formatDate(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'dd.MM.yyyy');
}

export function formatTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'HH:mm');
}

/** "yyyy-MM-dd" (Tashkent kuni) — API/grid kalitlari uchun. */
export function formatApiDate(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
}

export function formatDateTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'dd.MM.yyyy HH:mm');
}

/**
 * Ikki sana orasidagi daqiqa farqi (b - a). Manfiy bo'lishi mumkin.
 */
export function minutesBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 60_000);
}

/**
 * Bugundan necha kun oldin/keyin (Tashkent kuni bo'yicha)
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

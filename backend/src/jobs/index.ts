import cron from 'node-cron';
import { logger } from '../core/logger/logger.js';
import { TIMEZONE } from '../core/config/constants.js';
import { syncBillzJob } from './billz-sync.job.js';
import { sendDailyReport } from './daily-report.job.js';
import { sendWeeklyReport, sendMonthlyReport } from './period-report.job.js';
import { sendMorningReminders } from './morning-reminder.job.js';
import { markAbsenteesJob } from './mark-absentees.job.js';
import { dailyRewardsJob } from './daily-rewards.job.js';

/**
 * Barcha cron joblar ro'yxati.
 *
 * Schedule format: standard cron (min hour day month dayOfWeek)
 * Vaqt zonasi: Asia/Tashkent
 */
export function startJobs(): void {
  // Har 15 daqiqada — Billz savdolarni sinxronizatsiya (bugungi kun deyarli real-time)
  cron.schedule('*/15 * * * *', () => void syncBillzJob(), { timezone: TIMEZONE });

  // Har kuni 09:05 — hali kelmaganlarga eslatma
  cron.schedule('5 9 * * *', () => void sendMorningReminders(), { timezone: TIMEZONE });

  // Har kuni 21:00 — kunlik hisobot
  cron.schedule('0 21 * * *', () => void sendDailyReport(), { timezone: TIMEZONE });

  // Har kuni 23:30 — kelmaganlarni aniqlash (kechki smena tugaganidan keyin)
  cron.schedule('30 23 * * *', () => void markAbsenteesJob(), { timezone: TIMEZONE });

  // Har kuni 23:40 — kunlik avto-rag'batlar (top do'kon, bo'lim top xodim)
  cron.schedule('40 23 * * *', () => void dailyRewardsJob(), { timezone: TIMEZONE });

  // Har yakshanba 21:00 — haftalik hisobot
  cron.schedule('0 21 * * 0', () => void sendWeeklyReport(), { timezone: TIMEZONE });

  // Har oyning 1-kuni 09:00 — oylik hisobot
  cron.schedule('0 9 1 * *', () => void sendMonthlyReport(), { timezone: TIMEZONE });

  logger.info(
    {
      jobs: [
        'billz-sync (every 15m)',
        'morning-reminder (09:05)',
        'daily-report (21:00)',
        'mark-absentees (23:30)',
        'daily-rewards (23:40)',
        'weekly-report (Sun 21:00)',
        'monthly-report (1st 09:00)',
      ],
    },
    'Cron joblar ishga tushirildi',
  );
}

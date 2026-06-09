/**
 * Bitta cron jobni qo'lda ishga tushirish (debug uchun).
 *
 * Foydalanish:
 *   npx tsx src/scripts/run-job.ts daily-report
 *   npx tsx src/scripts/run-job.ts morning-reminder
 *   npx tsx src/scripts/run-job.ts billz-sync
 *   npx tsx src/scripts/run-job.ts weekly-report
 *   npx tsx src/scripts/run-job.ts monthly-report
 */

import '../core/config/load-env.js';
import { connectDatabase, disconnectDatabase } from '../core/database/connection.js';
import { logger } from '../core/logger/logger.js';
import { syncBillzJob } from '../jobs/billz-sync.job.js';
import { sendDailyReport } from '../jobs/daily-report.job.js';
import { sendWeeklyReport, sendMonthlyReport } from '../jobs/period-report.job.js';
import { sendMorningReminders } from '../jobs/morning-reminder.job.js';
import { markAbsenteesJob } from '../jobs/mark-absentees.job.js';
import { dailyRewardsJob } from '../jobs/daily-rewards.job.js';

const JOBS: Record<string, () => Promise<void>> = {
  'billz-sync': syncBillzJob,
  'morning-reminder': sendMorningReminders,
  'daily-report': sendDailyReport,
  'weekly-report': sendWeeklyReport,
  'monthly-report': sendMonthlyReport,
  'mark-absentees': markAbsenteesJob,
  'daily-rewards': dailyRewardsJob,
};

async function main(): Promise<void> {
  const name = process.argv[2];
  if (!name || !(name in JOBS)) {
    console.error(`Mavjud joblar: ${Object.keys(JOBS).join(', ')}`);
    process.exit(1);
  }

  await connectDatabase();
  try {
    logger.info({ job: name }, 'Job ishga tushirildi (qo\'lda)');
    await JOBS[name]!();
    logger.info({ job: name }, '✅ Tugadi');
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'run-job xato');
  process.exit(1);
});

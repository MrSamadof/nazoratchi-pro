import { reportsService } from '../modules/reports/reports.service.js';
import { auditLogsService } from '../modules/audit-logs/audit-logs.service.js';
import { aiService } from '../modules/ai/ai.service.js';
import { notifyManagers } from '../notifications/telegram.js';
import { startOfTashkentDay, formatDate } from '../core/utils/date.js';
import { formatMoney } from '../core/utils/format.js';
import { logger } from '../core/logger/logger.js';

/**
 * Har kuni soat 21:00 (Tashkent) — kunlik hisobotni menejer va CEO larga Telegram orqali yuboradi.
 */
export async function sendDailyReport(): Promise<void> {
  try {
    const today = startOfTashkentDay();
    const summary = await reportsService.todayAttendanceSummary();
    const salesText = await reportsService.formatDailySalesText(today);
    const leaderboardText = await reportsService.formatDailyLeaderboardText(today);

    let msg = `📊 *KUNLIK HISOBOT* — ${formatDate(today)}\n\n`;
    msg += `*Davomat:*\n`;
    msg += `👥 Jami: ${summary.totalEmployees}\n`;
    msg += `🟢 Keldi: ${summary.checkedIn}\n`;
    msg += `🔴 Ketdi: ${summary.checkedOut}\n`;
    msg += `⚠️ Kech keldi: ${summary.late}\n`;
    msg += `❌ Kelmadi: ${summary.absent}\n`;
    msg += `💸 Jami jarima: ${formatMoney(summary.totalPenalty)} so'm\n\n`;
    msg += salesText;
    msg += leaderboardText;

    const { sent, skipped } = await notifyManagers(msg);
    await auditLogsService.log({
      action: 'admin.report_generated',
      meta: { type: 'daily', recipients: sent, skipped },
    });
    logger.info({ sent, skipped }, 'Kunlik hisobot yuborildi');

    if (await aiService.isEnabled()) {
      const analysis = await aiService.analyzeReport(msg, 'kunlik');
      if (analysis) {
        await notifyManagers(`🤖 *AI tahlil:*\n\n${analysis}`);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Kunlik hisobot xato');
  }
}

import { reportsService } from '../modules/reports/reports.service.js';
import { auditLogsService } from '../modules/audit-logs/audit-logs.service.js';
import { aiService } from '../modules/ai/ai.service.js';
import { notifyManagers } from '../notifications/telegram.js';
import { startOfTashkentDay, formatDate, addDays } from '../core/utils/date.js';
import { formatMoney } from '../core/utils/format.js';
import { logger } from '../core/logger/logger.js';

async function sendPeriodReport(days: number, name: string): Promise<void> {
  try {
    const to = startOfTashkentDay();
    const from = addDays(to, -(days - 1));
    const sales = await reportsService.buildSalesReport(from, to);

    let msg = `📊 *${name.toUpperCase()} HISOBOT*\n`;
    msg += `${formatDate(from)} — ${formatDate(to)}\n\n`;

    msg += '*Billz savdo (do\'kon bo\'yicha):*\n';
    if (sales.billzByStore.length === 0) {
      msg += '_ma\'lumot yo\'q_\n';
    } else {
      for (const b of sales.billzByStore) {
        msg += `🏪 ${b.storeName} — ${formatMoney(b.totalAmount)} so'm (${b.itemCount} dona)\n`;
      }
    }

    if (sales.manualByStore.length > 0) {
      msg += '\n*Qo\'lda kiritilgan:*\n';
      for (const m of sales.manualByStore) {
        msg += `🏪 ${m.storeName} — ${m.quantity} dona\n`;
      }
    }

    msg += `\n💰 *Jami:* ${formatMoney(sales.grandTotalAmount)} so'm`;

    const { sent, skipped } = await notifyManagers(msg);
    await auditLogsService.log({
      action: 'admin.report_generated',
      meta: { type: name.toLowerCase(), recipients: sent, skipped },
    });
    logger.info({ sent, skipped, name }, `${name} hisobot yuborildi`);

    if (await aiService.isEnabled()) {
      const analysis = await aiService.analyzeReport(msg, name.toLowerCase());
      if (analysis) {
        await notifyManagers(`🤖 *AI tahlil (${name}):*\n\n${analysis}`);
      }
    }
  } catch (err) {
    logger.error({ err, name }, `${name} hisobot xato`);
  }
}

export async function sendWeeklyReport(): Promise<void> {
  await sendPeriodReport(7, 'Haftalik');
}

export async function sendMonthlyReport(): Promise<void> {
  await sendPeriodReport(30, 'Oylik');
  await sendMonthlyPenaltyReward();
  await sendMonthlyAttendance();
}

/** Oylik jarima + rag'bat hisoboti — admin va CEO ga. */
async function sendMonthlyPenaltyReward(): Promise<void> {
  try {
    const to = startOfTashkentDay();
    const from = addDays(to, -29);
    const data = await reportsService.monthlyPenaltyReward(from, to);

    let msg = `💸 *OYLIK JARIMA & RAG'BAT*\n${formatDate(from)} — ${formatDate(to)}\n\n`;

    if (data.byUser.length === 0) {
      msg += '_xodimlar bo\'yicha ma\'lumot yo\'q_\n';
    } else {
      for (const r of data.byUser.slice(0, 20)) {
        msg += `👤 ${r.fullName} — `;
        msg += `🎁 ${formatMoney(r.reward)} / 💢 ${formatMoney(r.penalty)} so'm\n`;
      }
    }

    if (data.storeRewards.length > 0) {
      msg += '\n*Do\'kon rag\'batlari:*\n';
      for (const s of data.storeRewards) {
        msg += `🏪 ${s.storeName} — ${formatMoney(s.total)} so'm\n`;
      }
    }

    msg += `\n🎁 *Jami rag'bat:* ${formatMoney(data.totalReward)} so'm`;
    msg += `\n💢 *Jami jarima:* ${formatMoney(data.totalPenalty)} so'm`;

    const { sent } = await notifyManagers(msg);
    await auditLogsService.log({
      action: 'admin.report_generated',
      meta: { type: 'monthly_penalty_reward', recipients: sent },
    });
    logger.info({ sent }, 'Oylik jarima/rag\'bat hisoboti yuborildi');
  } catch (err) {
    logger.error({ err }, 'Oylik jarima/rag\'bat hisoboti xato');
  }
}

/** Oylik keldi-ketdi hisoboti — admin va CEO ga. */
async function sendMonthlyAttendance(): Promise<void> {
  try {
    const to = startOfTashkentDay();
    const from = addDays(to, -29);
    const rows = await reportsService.monthlyAttendance(from, to);

    let msg = `🕒 *OYLIK KELDI-KETDI*\n${formatDate(from)} — ${formatDate(to)}\n\n`;

    if (rows.length === 0) {
      msg += '_ma\'lumot yo\'q_\n';
    } else {
      for (const r of rows.slice(0, 25)) {
        msg += `👤 ${r.fullName} (${r.storeName})\n`;
        msg += `   ✅ ${r.presentDays} · ⏰ ${r.lateDays} · ⬇️ ${r.earlyDays} · ❌ ${r.absentDays}\n`;
      }
      msg += '\n_✅ keldi · ⏰ kech · ⬇️ erta ketdi · ❌ kelmadi_';
    }

    const { sent } = await notifyManagers(msg);
    await auditLogsService.log({
      action: 'admin.report_generated',
      meta: { type: 'monthly_attendance', recipients: sent },
    });
    logger.info({ sent }, 'Oylik keldi-ketdi hisoboti yuborildi');
  } catch (err) {
    logger.error({ err }, 'Oylik keldi-ketdi hisoboti xato');
  }
}

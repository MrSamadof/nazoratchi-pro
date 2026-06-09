import { User } from '../modules/users/users.model.js';
import { attendancesService } from '../modules/attendances/attendances.service.js';
import { schedulesService } from '../modules/schedules/schedules.service.js';
import { notifyUser, isTelegramEnabled } from '../notifications/telegram.js';
import { logger } from '../core/logger/logger.js';

/**
 * Ertalab eslatma — hali "Keldim" qilmagan xodimlarga Telegram orqali eslatma yuboradi.
 * Cron orqali ish boshlanish vaqtidan biroz keyin (masalan 09:05) chaqiriladi.
 *
 * Veb ilovaga ko'chgandan keyin: bot tugma yo'q, oddiy matn eslatma.
 */
export async function sendMorningReminders(): Promise<void> {
  if (!(await isTelegramEnabled())) {
    logger.info('Telegram o\'chirilgan, ertalabki eslatma o\'tkazib yuborildi');
    return;
  }

  const employees = await User.find({
    isActive: true,
    isApproved: true,
    storeId: { $ne: null },
    telegramId: { $ne: null },
    role: { $in: ['employee', 'manager', 'ceo'] },
  });

  let sent = 0;
  let skipped = 0;

  for (const emp of employees) {
    if (!emp.telegramId) {
      skipped++;
      continue;
    }
    const today = await attendancesService.getTodayAttendance(emp._id);
    if (today?.checkIn) {
      skipped++;
      continue;
    }

    // Bugun dam olish kuni bo'lsa — eslatma yubormaymiz.
    const shift = await schedulesService.getShiftWindow(emp._id);
    if (shift.isDayOff) {
      skipped++;
      continue;
    }

    await notifyUser(
      emp.telegramId,
      '☀️ *Xayrli tong!*\n\n' +
        'Hali bugun "Keldim" deb belgilamadingiz.\n' +
        'Web ilovani oching va *Keldim* tugmasini bosing.',
    );
    sent++;
  }

  logger.info({ sent, skipped, total: employees.length }, 'Ertalabki eslatmalar yuborildi');
}

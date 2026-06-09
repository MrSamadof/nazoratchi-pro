import { salesService } from '../modules/sales/sales.service.js';
import { rewardsService } from '../modules/rewards/rewards.service.js';
import { User } from '../modules/users/users.model.js';
import { Store } from '../modules/stores/stores.model.js';
import { DAILY_REWARDS, DIVISIONS, type Division } from '../core/config/constants.js';
import { startOfTashkentDay, formatDate } from '../core/utils/date.js';
import { notifyManagers } from '../notifications/telegram.js';
import { formatMoney } from '../core/utils/format.js';
import { logger } from '../core/logger/logger.js';

/**
 * Kunlik avto-rag'bat — kun oxirida (savdolar kiritilgandan keyin) ishlaydi.
 *  - Eng ko'p mahsulot sotgan do'kon → topStore (100 000 so'm)
 *  - Har bo'lim ichida eng ko'p sotgan xodim → topEmployee (dubai 50k / amir 25k)
 *
 * Idempotent: o'sha kun uchun avval yaratilgan rag'batlar qayta yaratilmaydi.
 */
export async function dailyRewardsJob(date: Date = startOfTashkentDay()): Promise<void> {
  const day = startOfTashkentDay(date);
  const lines: string[] = [];

  // 1) Eng ko'p sotgan do'kon
  const storeRows = await salesService.getDailyQuantityByStore(day);
  if (storeRows.length > 0) {
    const top = storeRows[0]!;
    const store = await Store.findById(top.storeId);
    const { created } = await rewardsService.createAuto({
      type: 'auto_store',
      amount: DAILY_REWARDS.topStore,
      reason: `Kunlik eng ko'p mahsulot sotgan do'kon (${top.quantity} dona)`,
      date: day,
      storeId: top.storeId,
    });
    if (created && store) {
      lines.push(`🏆 Do'kon: *${store.name}* — ${formatMoney(DAILY_REWARDS.topStore)} so'm (${top.quantity} dona)`);
    }
  }

  // 2) Bo'lim bo'yicha eng ko'p sotgan xodim
  const userRows = await salesService.getDailyQuantityByUser(day);
  if (userRows.length > 0) {
    const users = await User.find({
      _id: { $in: userRows.map((r) => r.userId) },
    });
    const divisionOf = new Map<string, Division | null>(
      users.map((u) => [u._id.toString(), (u.division as Division | null) ?? null]),
    );
    const nameOf = new Map<string, string>(
      users.map((u) => [u._id.toString(), `${u.lastName} ${u.firstName}`.trim()]),
    );

    // userRows allaqachon ko'pdan kamga saralangan — har bo'lim uchun birinchi mosi top.
    for (const division of DIVISIONS) {
      const topRow = userRows.find((r) => divisionOf.get(r.userId.toString()) === division);
      if (!topRow) continue;
      const amount = DAILY_REWARDS.topEmployee[division];
      const { created } = await rewardsService.createAuto({
        type: 'auto_employee',
        amount,
        reason: `${division === 'dubai_house' ? 'Dubai House' : 'Amir'} bo'limi — kunlik eng ko'p sotgan (${topRow.quantity} dona)`,
        date: day,
        userId: topRow.userId,
        division,
      });
      if (created) {
        const label = division === 'dubai_house' ? 'Dubai House' : 'Amir';
        lines.push(`🥇 ${label}: *${nameOf.get(topRow.userId.toString())}* — ${formatMoney(amount)} so'm (${topRow.quantity} dona)`);
      }
    }
  }

  logger.info({ rewards: lines.length, date: formatDate(day) }, 'Kunlik avto-rag\'batlar');

  if (lines.length > 0) {
    await notifyManagers(`🎁 *Kunlik rag'batlar* — ${formatDate(day)}\n\n${lines.join('\n')}`);
  }
}

import type { Types } from 'mongoose';
import { Attendance } from '../attendances/attendances.model.js';
import { Sale } from '../sales/sales.model.js';
import { User } from '../users/users.model.js';
import { Store } from '../stores/stores.model.js';
import { billzService } from '../billz/billz.service.js';
import { rewardsService } from '../rewards/rewards.service.js';
import { startOfTashkentDay, formatDate, formatTime } from '../../core/utils/date.js';
import { formatMoney } from '../../core/utils/format.js';
import { DIVISIONS, DIVISION_LABELS, type Division } from '../../core/config/constants.js';

export interface LeaderboardStoreRow {
  storeId: string;
  storeName: string;
  count: number;
}

export interface LeaderboardEmployeeRow {
  userId: string;
  fullName: string;
  count: number;
  isMe: boolean;
}

export interface DivisionLeaderboard {
  division: Division;
  label: string;
  rows: LeaderboardEmployeeRow[];
}

export interface DailyLeaderboard {
  date: Date;
  stores: LeaderboardStoreRow[];
  employeesByDivision: DivisionLeaderboard[];
  me: { count: number; rank: number | null; division: Division | null };
}

export interface MonthlyPenaltyRewardRow {
  userId: string;
  fullName: string;
  penalty: number;
  reward: number;
}

export interface MonthlyAttendanceRow {
  userId: string;
  fullName: string;
  storeName: string;
  presentDays: number;
  lateDays: number;
  earlyDays: number;
  absentDays: number;
  penalty: number;
}

export interface OffSiteEvent {
  attendanceId: string;
  userName: string;
  storeName: string;
  type: 'check_in' | 'check_out';
  at: Date;
  distanceMeters: number | null;
  source: 'store' | 'other';
  note: string;
}

export interface AttendanceReportRow {
  fullName: string;
  storeName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  penalty: number;
  penaltyAccepted: boolean;
}

export class ReportsService {
  /**
   * Berilgan davr uchun davomat hisoboti.
   */
  async buildAttendanceReport(
    from: Date,
    to: Date,
  ): Promise<AttendanceReportRow[]> {
    const records = await Attendance.find({ date: { $gte: from, $lte: to } })
      .populate('userId', 'firstName lastName')
      .populate('storeId', 'name')
      .sort({ date: -1 })
      .lean();

    return records.map((r) => {
      const user = r.userId as unknown as { firstName: string; lastName: string } | null;
      const store = r.storeId as unknown as { name: string } | null;
      return {
        fullName: user ? `${user.lastName} ${user.firstName}` : '—',
        storeName: store?.name ?? '—',
        checkIn: r.checkIn ? formatTime(r.checkIn) : '—',
        checkOut: r.checkOut ? formatTime(r.checkOut) : '—',
        status: String(r.status ?? ''),
        penalty: r.penaltyAmount ?? 0,
        penaltyAccepted: !!r.penaltyAccepted,
      };
    });
  }

  /**
   * Oylik (yoki ixtiyoriy davr) jarima + rag'bat hisoboti — xodim bo'yicha.
   * Do'kon avto-rag'batlari alohida qaytariladi.
   */
  async monthlyPenaltyReward(
    from: Date,
    to: Date,
  ): Promise<{
    byUser: MonthlyPenaltyRewardRow[];
    storeRewards: Array<{ storeName: string; total: number }>;
    totalPenalty: number;
    totalReward: number;
  }> {
    const penaltyAgg = await Attendance.aggregate<{ _id: Types.ObjectId; penalty: number }>([
      { $match: { date: { $gte: from, $lte: to }, penaltyAmount: { $gt: 0 } } },
      { $group: { _id: '$userId', penalty: { $sum: '$penaltyAmount' } } },
    ]);
    const rewardRows = await rewardsService.approvedByUser(from, to);

    const map = new Map<string, { penalty: number; reward: number }>();
    for (const p of penaltyAgg) {
      map.set(p._id.toString(), { penalty: p.penalty, reward: 0 });
    }
    for (const r of rewardRows) {
      const key = r.userId.toString();
      const cur = map.get(key) ?? { penalty: 0, reward: 0 };
      cur.reward += r.total;
      map.set(key, cur);
    }

    const ids = [...map.keys()];
    const users = await User.find({ _id: { $in: ids } }).select('firstName lastName').lean();
    const nameOf = new Map(users.map((u) => [u._id.toString(), `${u.lastName} ${u.firstName}`.trim()]));

    const byUser: MonthlyPenaltyRewardRow[] = ids
      .map((id) => ({
        userId: id,
        fullName: nameOf.get(id) ?? '—',
        penalty: map.get(id)!.penalty,
        reward: map.get(id)!.reward,
      }))
      .sort((a, b) => b.reward - a.reward || b.penalty - a.penalty);

    // Do'kon avto-rag'batlari
    const storeRewardRows = await rewardsService.approvedByStore(from, to);
    const stores = await Store.find({ _id: { $in: storeRewardRows.map((s) => s.storeId) } })
      .select('name')
      .lean();
    const storeName = new Map(stores.map((s) => [String(s._id), s.name as string]));
    const storeRewards = storeRewardRows.map((s) => ({
      storeName: storeName.get(s.storeId.toString()) ?? '—',
      total: s.total,
    }));

    const totalPenalty = byUser.reduce((sum, r) => sum + r.penalty, 0);
    const totalReward =
      byUser.reduce((sum, r) => sum + r.reward, 0) +
      storeRewards.reduce((sum, r) => sum + r.total, 0);

    return { byUser, storeRewards, totalPenalty, totalReward };
  }

  /**
   * Oylik keldi-ketdi hisoboti — xodim bo'yicha kun statuslari jamlanadi.
   */
  async monthlyAttendance(from: Date, to: Date): Promise<MonthlyAttendanceRow[]> {
    const agg = await Attendance.aggregate<{
      _id: Types.ObjectId;
      present: number;
      late: number;
      early: number;
      absent: number;
      penalty: number;
    }>([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$userId',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          early: { $sum: { $cond: [{ $eq: ['$status', 'left_early'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          penalty: { $sum: '$penaltyAmount' },
        },
      },
    ]);

    const ids = agg.map((a) => a._id);
    const users = await User.find({ _id: { $in: ids } })
      .select('firstName lastName storeId')
      .populate('storeId', 'name')
      .lean();
    const userInfo = new Map(
      users.map((u) => {
        const store = u.storeId as unknown as { name: string } | null;
        return [
          u._id.toString(),
          { name: `${u.lastName} ${u.firstName}`.trim(), store: store?.name ?? '—' },
        ];
      }),
    );

    return agg
      .map((a) => {
        const info = userInfo.get(a._id.toString());
        return {
          userId: a._id.toString(),
          fullName: info?.name ?? '—',
          storeName: info?.store ?? '—',
          presentDays: a.present,
          lateDays: a.late,
          earlyDays: a.early,
          absentDays: a.absent,
          penalty: a.penalty,
        };
      })
      .sort((a, b) => b.absentDays - a.absentDays || b.lateDays - a.lateDays);
  }

  /**
   * Bugungi davomat — admin paneldagi tezkor ko'rinish.
   */
  async todayAttendanceSummary(): Promise<{
    totalEmployees: number;
    checkedIn: number;
    checkedOut: number;
    late: number;
    absent: number;
    totalPenalty: number;
  }> {
    const today = startOfTashkentDay();

    const [totalEmployees, attendanceRecords] = await Promise.all([
      User.countDocuments({ role: 'employee', isActive: true, isApproved: true }),
      Attendance.find({ date: today }),
    ]);

    const summary = {
      totalEmployees,
      checkedIn: 0,
      checkedOut: 0,
      late: 0,
      absent: 0,
      totalPenalty: 0,
    };

    for (const r of attendanceRecords) {
      if (r.checkIn) summary.checkedIn++;
      if (r.checkOut) summary.checkedOut++;
      if (r.status === 'late') summary.late++;
      summary.totalPenalty += r.penaltyAmount ?? 0;
    }
    summary.absent = totalEmployees - summary.checkedIn;
    return summary;
  }

  /**
   * Kunlik reyting — do'konlar aro va xodimlar aro.
   * Faqat qo'lda kiritilgan (manual) savdolar hisobga olinadi, chunki Billz
   * mahsulot-darajadagi ma'lumotni bermaydi. Reyting sotilgan dona soni
   * bo'yicha tuziladi.
   */
  async dailyLeaderboard(
    currentUserId: Types.ObjectId | null = null,
    date: Date = startOfTashkentDay(),
  ): Promise<DailyLeaderboard> {
    const baseMatch = {
      date,
      source: 'manual',
      quantity: { $gt: 0 },
    };

    const [storeAgg, userAgg] = await Promise.all([
      Sale.aggregate<{ storeId: Types.ObjectId; storeName: string; count: number }>([
        { $match: baseMatch },
        { $group: { _id: '$storeId', count: { $sum: '$quantity' } } },
        { $match: { count: { $gt: 0 } } },
        { $lookup: { from: 'stores', localField: '_id', foreignField: '_id', as: 'store' } },
        { $unwind: '$store' },
        { $project: { _id: 0, storeId: '$_id', storeName: '$store.name', count: 1 } },
        { $sort: { count: -1, storeName: 1 } },
      ]),
      Sale.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: baseMatch },
        { $group: { _id: '$userId', count: { $sum: '$quantity' } } },
        { $match: { count: { $gt: 0 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const userIds = userAgg.map((u) => u._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName division')
      .lean();
    const userInfo = new Map(
      users.map((u) => [
        u._id.toString(),
        {
          name: `${u.lastName ?? ''} ${u.firstName}`.trim(),
          division: (u.division ?? null) as Division | null,
        },
      ]),
    );

    const meId = currentUserId ? currentUserId.toString() : null;

    // Doim ikkala bo'lim, DIVISIONS tartibida.
    const employeesByDivision: DivisionLeaderboard[] = DIVISIONS.map((division) => ({
      division,
      label: DIVISION_LABELS[division],
      rows: [] as LeaderboardEmployeeRow[],
    }));
    const bucketOf = new Map(employeesByDivision.map((b) => [b.division, b]));

    // userAgg allaqachon count kamayishi bo'yicha saralangan ($sort yuqorida).
    let me: { count: number; rank: number | null; division: Division | null } = {
      count: 0,
      rank: null,
      division: null,
    };
    for (const u of userAgg) {
      const id = u._id.toString();
      const info = userInfo.get(id);
      const division = info?.division ?? null;
      // null yoki boshqa bo'lim — chiqarib tashlanadi.
      if (division !== 'dubai_house' && division !== 'amir') continue;
      const bucket = bucketOf.get(division)!;
      const isMe = id === meId;
      bucket.rows.push({
        userId: id,
        fullName: info?.name ?? '—',
        count: u.count,
        isMe,
      });
      if (isMe) {
        // bucket.rows.length = shu bo'lim ichidagi 1-indeksli o'rin (count desc tartibda).
        me = { count: u.count, rank: bucket.rows.length, division };
      }
    }

    return {
      date,
      stores: storeAgg.map((s) => ({
        storeId: s.storeId.toString(),
        storeName: s.storeName,
        count: s.count,
      })),
      employeesByDivision,
      me,
    };
  }

  /**
   * Kunlik reytingni Telegram (Markdown) uchun matn ko’rinishiga keltiradi.
   * Hisobga olinadigan savdo bo’lmasa bo’sh satr qaytaradi.
   */
  async formatDailyLeaderboardText(
    date: Date = startOfTashkentDay(),
    employeeLimit = 10,
  ): Promise<string> {
    const board = await this.dailyLeaderboard(null, date);
    const hasEmployees = board.employeesByDivision.some((d) => d.rows.length > 0);
    if (board.stores.length === 0 && !hasEmployees) return '';

    const medals = ['🥇', '🥈', '🥉'];
    const storeIcon = (i: number): string => medals[i] ?? `${i + 1}.`;
    const empIcon = (i: number): string => medals[i] ?? '▪️';

    let text = `\n🏆 *REYTING* — sotilgan dona bo’yicha\n`;
    text += '━━━━━━━━━━━━━━━━━━\n';

    if (board.stores.length > 0) {
      text += `*Do’konlar aro:*\n`;
      board.stores.forEach((s, i) => {
        text += `${storeIcon(i)} ${s.storeName} — ${s.count} dona\n`;
      });
    }

    for (const d of board.employeesByDivision) {
      text += `\n🏪 *${d.label} bo’limi:*\n`;
      if (d.rows.length === 0) {
        text += `— hali savdo yo’q\n`;
        continue;
      }
      d.rows.slice(0, employeeLimit).forEach((e, i) => {
        text += `${empIcon(i)} ${e.fullName} — ${e.count} dona\n`;
      });
    }

    if (hasEmployees) {
      text +=
        `\n✨ Katta natijalar siz kabi xarakatdan to’xtamaydigan insonlar bilan quriladi. Katta rahmat sizlarga!\n`;
    }

    return text;
  }

  /**
   * Bugungi off-site (do'kondan tashqari) check-in / check-out hodisalari.
   * Manager o'z do'koni bo'yicha, CEO uchun barchasi (scopeStoreId=null).
   */
  async todayOffSiteEvents(scopeStoreId: Types.ObjectId | null): Promise<OffSiteEvent[]> {
    const today = startOfTashkentDay();
    const filter: Record<string, unknown> = {
      date: today,
      $or: [{ checkInOffSite: true }, { checkOutOffSite: true }],
    };
    if (scopeStoreId) filter.storeId = scopeStoreId;

    const records = await Attendance.find(filter)
      .populate('userId', 'firstName lastName')
      .populate('storeId', 'name')
      .sort({ checkOut: -1, checkIn: -1 })
      .lean();

    const events: OffSiteEvent[] = [];
    for (const r of records) {
      const user = r.userId as unknown as { firstName: string; lastName: string } | null;
      const store = r.storeId as unknown as { name: string } | null;
      const userName = user ? `${user.lastName} ${user.firstName}`.trim() : '—';
      const storeName = store?.name ?? '—';
      if (r.checkInOffSite && r.checkIn) {
        events.push({
          attendanceId: String(r._id),
          userName,
          storeName,
          type: 'check_in',
          at: r.checkIn,
          distanceMeters: r.checkInLocation?.distanceMeters ?? null,
          source: 'store',
          note: '',
        });
      }
      if (r.checkOutOffSite && r.checkOut) {
        events.push({
          attendanceId: String(r._id),
          userName,
          storeName,
          type: 'check_out',
          at: r.checkOut,
          distanceMeters: r.checkOutLocation?.distanceMeters ?? null,
          source: (r.checkOutSource as 'store' | 'other') ?? 'store',
          note: r.checkOutNote ?? '',
        });
      }
    }
    return events.sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  /**
   * Manual savdo (xodimlar kiritgan) + Billz savdo birlashtirilgan.
   */
  async buildSalesReport(
    from: Date,
    to: Date,
  ): Promise<{
    manualByStore: Array<{ storeName: string; quantity: number }>;
    billzByStore: Array<{ storeName: string; totalAmount: number; itemCount: number }>;
    grandTotalAmount: number;
  }> {
    // Manual savdolar — do'kon bo'yicha (faqat dona soni; summa hisobga olinmaydi)
    const manualAgg = await Sale.aggregate<{
      _id: { storeId: unknown };
      quantity: number;
      storeName: string;
    }>([
      { $match: { date: { $gte: from, $lte: to }, source: 'manual' } },
      {
        $group: {
          _id: '$storeId',
          quantity: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store',
        },
      },
      { $unwind: '$store' },
      {
        $project: {
          storeName: '$store.name',
          quantity: 1,
        },
      },
      { $sort: { quantity: -1 } },
    ]);

    const billzAgg = await billzService.getStoreSales(from, to);

    // Pul jami faqat Billz (haqiqiy kassa) bo'yicha hisoblanadi.
    const grandTotalAmount = billzAgg.reduce((s, b) => s + b.totalAmount, 0);

    return {
      manualByStore: manualAgg.map((m) => ({
        storeName: m.storeName,
        quantity: m.quantity,
      })),
      billzByStore: billzAgg,
      grandTotalAmount,
    };
  }

  /**
   * Eski v1 formatidagi matnli kunlik hisobot.
   */
  async formatDailySalesText(date: Date = startOfTashkentDay()): Promise<string> {
    const billz = await billzService.getCachedDailySales(date);
    const stores = await Store.find({ hasBillz: true, isActive: true });

    let text = `📊 SAVDO HISOBOTI — ${formatDate(date)}\n`;
    text += '━━━━━━━━━━━━━━━━━━\n';

    let total = 0;
    let topStore = '';
    let topAmount = 0;

    for (const store of stores) {
      // b.storeId populate qilingan (Store hujjati) — _id bo'yicha solishtiramiz.
      const sale = billz.find((b) => {
        const sid = (b.storeId as { _id?: Types.ObjectId })?._id ?? b.storeId;
        return sid.toString() === store._id.toString();
      });
      const amount = sale?.totalAmount ?? 0;
      const items = sale?.itemCount ?? 0;
      text += `🏪 ${store.name} — ${formatMoneyShort(amount)} (${items} dona)\n`;
      total += amount;
      if (amount > topAmount) {
        topAmount = amount;
        topStore = store.name;
      }
    }

    text += '━━━━━━━━━━━━━━━━━━\n';
    text += `💰 Jami: ${formatMoney(total)} so'm\n`;
    if (topStore) text += `🏆 Eng yaxshi: ${topStore}`;
    return text;
  }
}

function formatMoneyShort(amount: number): string {
  if (amount === 0) return '0';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} mln`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} K`;
  return amount.toString();
}

export const reportsService = new ReportsService();

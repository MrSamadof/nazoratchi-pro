import type { Types } from 'mongoose';
import { Sale } from '../sales/sales.model.js';
import { BillzSale } from '../billz/billz.model.js';
import { Attendance } from '../attendances/attendances.model.js';
import { User } from '../users/users.model.js';
import { Store } from '../stores/stores.model.js';
import { startOfTashkentDay, addDays, formatApiDate } from '../../core/utils/date.js';

export interface CeoInsights {
  today: {
    checkedIn: number;
    late: number;
    absent: number;
    totalPenalty: number;
    totalEmployees: number;
  };
  week: {
    totalSales: number;
    totalItems: number;
    salesByDay: number[];
    itemsByDay: number[];
    presentByDay: number[];
    delta: number;
  };
  stores: Array<{
    id: string;
    name: string;
    hasBillz: boolean;
    weeklyTarget: number;
    monthlyTarget: number;
    todayTotal: number;
    todayItems: number;
    weekTotal: number;
    weekItems: number;
    trend: number[];
  }>;
}

/**
 * CEO dashboard uchun real-time aggregation.
 * Davomat + Sales + Billz + Stores ni bir necha aggregation pipeline da qaytaradi.
 */
export async function getCeoInsights(): Promise<CeoInsights> {
  const today = startOfTashkentDay();
  const day7 = addDays(today, -6);
  const day14 = addDays(today, -13);

  const [
    todayAtt,
    totalEmployees,
    billzByDay,
    manualByDay,
    attByDay,
    storeAgg,
    manualStoreAgg,
    billzTodayByStore,
    manualTodayByStore,
    stores,
  ] = await Promise.all([
    Attendance.find({ date: today }),
    User.countDocuments({ role: 'employee', isActive: true, isApproved: true }),
    BillzSale.aggregate<{ _id: string; total: number; items: number }>([
      { $match: { date: { $gte: day14, $lte: today } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Tashkent' },
          },
          total: { $sum: '$totalAmount' },
          items: { $sum: '$itemCount' },
        },
      },
    ]),
    // Manual savdo — pul emas, faqat DONA (quantity). Pul faqat Billz'dan keladi.
    Sale.aggregate<{ _id: string; qty: number }>([
      { $match: { date: { $gte: day14, $lte: today } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Tashkent' },
          },
          qty: { $sum: '$quantity' },
        },
      },
    ]),
    Attendance.aggregate<{ _id: string; presentCount: number }>([
      { $match: { date: { $gte: day14, $lte: today } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Tashkent' },
          },
          presentCount: { $sum: { $cond: [{ $ne: ['$checkIn', null] }, 1, 0] } },
        },
      },
    ]),
    BillzSale.aggregate<{
      storeName: string;
      total: number;
      items: number;
      dailyByDate: { date: string; total: number }[];
    }>([
      { $match: { date: { $gte: day7, $lte: today } } },
      {
        $group: {
          _id: '$storeId',
          total: { $sum: '$totalAmount' },
          items: { $sum: '$itemCount' },
          dailyByDate: {
            $push: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$date',
                  timezone: 'Asia/Tashkent',
                },
              },
              total: '$totalAmount',
            },
          },
        },
      },
      { $lookup: { from: 'stores', localField: '_id', foreignField: '_id', as: 'store' } },
      { $unwind: '$store' },
      {
        $project: {
          storeName: '$store.name',
          total: 1,
          items: 1,
          dailyByDate: 1,
        },
      },
    ]),
    // Manual savdo — do'kon bo'yicha faqat DONA (quantity). Pul Billz'dan.
    Sale.aggregate<{
      storeName: string;
      qty: number;
    }>([
      { $match: { date: { $gte: day7, $lte: today } } },
      {
        $group: {
          _id: '$storeId',
          qty: { $sum: '$quantity' },
        },
      },
      { $lookup: { from: 'stores', localField: '_id', foreignField: '_id', as: 'store' } },
      { $unwind: '$store' },
      {
        $project: {
          storeName: '$store.name',
          qty: 1,
        },
      },
    ]),
    // Bugungi savdo — do'kon bo'yicha (Billz puli + dona).
    BillzSale.aggregate<{ _id: Types.ObjectId; total: number; items: number }>([
      { $match: { date: today } },
      { $group: { _id: '$storeId', total: { $sum: '$totalAmount' }, items: { $sum: '$itemCount' } } },
    ]),
    // Bugungi manual savdo — do'kon bo'yicha faqat DONA (quantity).
    Sale.aggregate<{ _id: Types.ObjectId; qty: number }>([
      { $match: { date: today } },
      { $group: { _id: '$storeId', qty: { $sum: '$quantity' } } },
    ]),
    // Ofislar savdo qilmaydi — reyting/taqqoslashga kirmaydi.
    Store.find({ isActive: true, kind: { $ne: 'office' } }).select(
      'name weeklyTarget monthlyTarget hasBillz',
    ),
  ]);

  const checkedIn = todayAtt.filter((a) => a.checkIn).length;
  const late = todayAtt.filter((a) => a.status === 'late').length;
  const absent = Math.max(0, totalEmployees - checkedIn);
  const totalPenalty = todayAtt.reduce((s, a) => s + (a.penaltyAmount ?? 0), 0);

  const billzMap = new Map(billzByDay.map((b) => [b._id, b]));
  const manualMap = new Map(manualByDay.map((m) => [m._id, m]));
  const attMap = new Map(attByDay.map((a) => [a._id, a]));

  const salesByDay: number[] = [];
  const itemsByDay: number[] = [];
  const presentByDay: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = formatApiDate(addDays(today, -i));
    // Pul faqat Billz'dan; mahsulot soni = Billz dona + manual dona.
    salesByDay.push(billzMap.get(key)?.total ?? 0);
    itemsByDay.push((billzMap.get(key)?.items ?? 0) + (manualMap.get(key)?.qty ?? 0));
    presentByDay.push(attMap.get(key)?.presentCount ?? 0);
  }

  const thisWeekSales = salesByDay.reduce((s, v) => s + v, 0);
  let prevWeekSales = 0;
  for (let i = 13; i >= 7; i--) {
    const key = formatApiDate(addDays(today, -i));
    prevWeekSales += billzMap.get(key)?.total ?? 0;
  }
  const delta = prevWeekSales > 0 ? ((thisWeekSales - prevWeekSales) / prevWeekSales) * 100 : 0;

  const trendKeys: string[] = [];
  for (let i = 6; i >= 0; i--) trendKeys.push(formatApiDate(addDays(today, -i)));
  const trendIdx = new Map(trendKeys.map((k, i) => [k, i]));

  const storeMap = new Map<string, { total: number; items: number; trend: number[] }>();

  function ensureStore(name: string) {
    let entry = storeMap.get(name);
    if (!entry) {
      entry = { total: 0, items: 0, trend: [0, 0, 0, 0, 0, 0, 0] };
      storeMap.set(name, entry);
    }
    return entry;
  }

  for (const s of storeAgg) {
    const entry = ensureStore(s.storeName);
    entry.total += s.total;
    entry.items += s.items;
    for (const d of s.dailyByDate) {
      const idx = trendIdx.get(d.date);
      if (idx !== undefined) entry.trend[idx]! += d.total;
    }
  }

  for (const s of manualStoreAgg) {
    // Manual savdo faqat dona soniga qo'shiladi; pul (total/trend) Billz'dan.
    const entry = ensureStore(s.storeName);
    entry.items += s.qty;
  }

  // Bugungi per-do'kon (id bo'yicha — nom takrorlanishi mumkin).
  const billzTodayMap = new Map(billzTodayByStore.map((b) => [b._id.toString(), b]));
  const manualTodayMap = new Map(manualTodayByStore.map((m) => [m._id.toString(), m]));

  return {
    today: { checkedIn, late, absent, totalPenalty, totalEmployees },
    week: {
      totalSales: thisWeekSales,
      totalItems: itemsByDay.reduce((s, v) => s + v, 0),
      salesByDay,
      itemsByDay,
      presentByDay,
      delta,
    },
    stores: stores
      .map((s) => {
        const w = storeMap.get(s.name);
        const idStr = s._id.toString();
        const bt = billzTodayMap.get(idStr);
        const mt = manualTodayMap.get(idStr);
        return {
          id: idStr,
          name: s.name,
          hasBillz: !!s.hasBillz,
          weeklyTarget: s.weeklyTarget ?? 0,
          monthlyTarget: s.monthlyTarget ?? 0,
          // Bugun: pul faqat Billz; dona = Billz + manual (haftalik bilan bir xil mantiq).
          todayTotal: bt?.total ?? 0,
          todayItems: (bt?.items ?? 0) + (mt?.qty ?? 0),
          weekTotal: w?.total ?? 0,
          weekItems: w?.items ?? 0,
          trend: w?.trend ?? [0, 0, 0, 0, 0, 0, 0],
        };
      })
      .sort((a, b) => b.weekTotal - a.weekTotal),
  };
}

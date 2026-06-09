/**
 * To'liq demo ma'lumotlar — loyiha "real ishlayotgandek" ko'rinishi uchun.
 *
 * Yaratadi/yangilaydi:
 *  - Do'konlar (5 ta), bo'lim konteksti bilan
 *  - Jarima qoidalari + kompaniya qoidalari
 *  - Foydalanuvchilar: CEO, menejer, xodimlar (login PIN bilan, bo'lim biriktirilgan)
 *  - Joriy hafta smena jadvali (Schedule)
 *  - Oxirgi 14 kun: davomat (kech/erta/kelmagan), manual savdo, Billz cache
 *  - Avto rag'batlar (haqiqiy job mantig'i bilan) + qo'lda rag'batlar
 *  - Topshiriqlar (turli status, biri muddat surish so'rovi bilan)
 *  - Bildirishnomalar
 *
 * Ishga tushirish: `npm run seed:demo`
 */

import '../core/config/load-env.js';
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../core/database/connection.js';
import { env } from '../core/config/env.js';
import { User } from '../modules/users/users.model.js';
import { Store } from '../modules/stores/stores.model.js';
import { Attendance } from '../modules/attendances/attendances.model.js';
import { Sale } from '../modules/sales/sales.model.js';
import { BillzSale } from '../modules/billz/billz.model.js';
import { Schedule } from '../modules/schedules/schedules.model.js';
import { Reward } from '../modules/rewards/rewards.model.js';
import { Task } from '../modules/tasks/tasks.model.js';
import { Notification } from '../modules/notifications/notifications.model.js';
import { PenaltyRule } from '../modules/penalties/penalties.model.js';
import { CompanyRule } from '../modules/company-rules/company-rules.model.js';
import { schedulesService } from '../modules/schedules/schedules.service.js';
import { dailyRewardsJob } from '../jobs/daily-rewards.job.js';
import { SHIFTS, type ShiftType, type Division } from '../core/config/constants.js';
import {
  startOfTashkentDay,
  addDays,
  tashkentTimeToday,
  formatApiDate,
} from '../core/utils/date.js';
import { logger } from '../core/logger/logger.js';

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function maybe(prob: number): boolean {
  return Math.random() < prob;
}
/** Berilgan kunning Tashkent hafta kuni (0=yakshanba ... 6=shanba). */
function tashkentDow(date: Date): number {
  return new Date(`${formatApiDate(date)}T12:00:00Z`).getUTCDay();
}

const DEMO_EMPLOYEE_PIN = '1111';
const DEMO_MANAGER_PIN = '2222';

interface StoreSpec {
  slug: string;
  name: string;
  division: Division;
  baseRevenue: number;
  weeklyTarget: number;
}

const STORES: StoreSpec[] = [
  { slug: 'amir-premium', name: 'Amir Premium', division: 'amir', baseRevenue: 800_000, weeklyTarget: 5_500_000 },
  { slug: 'amir-kids', name: 'Amir Kids', division: 'amir', baseRevenue: 450_000, weeklyTarget: 3_000_000 },
  { slug: 'dubai-house', name: 'Dubai House', division: 'dubai_house', baseRevenue: 600_000, weeklyTarget: 4_000_000 },
  { slug: 'dubai-abu-sahiy', name: 'Dubai House Abu Sahiy', division: 'dubai_house', baseRevenue: 400_000, weeklyTarget: 2_500_000 },
  { slug: 'dubai-afsona', name: 'Dubai House Afsona', division: 'dubai_house', baseRevenue: 350_000, weeklyTarget: 2_000_000 },
];

const FIRST_NAMES = ['Akmal', 'Madina', 'Jamshid', 'Nilufar', 'Sardor', 'Lola', 'Otabek', 'Dilfuza', 'Bekzod', 'Gulnoza', 'Rustam', 'Sevara', 'Aziz', 'Malika', 'Farrux'];
const LAST_NAMES = ['Tursunov', 'Yusupova', 'Boboyev', 'Ergasheva', "Yo'ldoshev", 'Bobokulova', 'Nazarov', 'Karimova', 'Olimov', 'Saidova', 'Qodirov', 'Ahmedova', 'Sobirov', 'Tosheva', 'Murodov'];

const DAYS = 14;

async function clearActivity(): Promise<void> {
  await Promise.all([
    Attendance.deleteMany({}),
    Sale.deleteMany({}),
    BillzSale.deleteMany({}),
    Schedule.deleteMany({}),
    Reward.deleteMany({}),
    Task.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  logger.info('Eski faollik maʼlumotlari tozalandi');
}

async function seedRules(): Promise<void> {
  await PenaltyRule.deleteMany({});
  await PenaltyRule.insertMany([
    { name: 'Kechikish 5-15 daq', type: 'late_arrival', minMinutes: 5, maxMinutes: 15, amount: 50_000, isActive: true },
    { name: 'Kechikish 16-30 daq', type: 'late_arrival', minMinutes: 16, maxMinutes: 30, amount: 100_000, isActive: true },
    { name: 'Kechikish 30+ daq', type: 'late_arrival', minMinutes: 31, maxMinutes: null, amount: 200_000, isActive: true },
    { name: 'Erta ketish 5-29 daq', type: 'early_leave', minMinutes: 5, maxMinutes: 29, amount: 50_000, isActive: true },
    { name: 'Erta ketish 30+ daq', type: 'early_leave', minMinutes: 30, maxMinutes: null, amount: 150_000, isActive: true },
    { name: 'Kelmaslik', type: 'absence', minMinutes: 0, maxMinutes: null, amount: 200_000, isActive: true },
  ]);

  const ruleCount = await CompanyRule.countDocuments();
  if (ruleCount === 0) {
    await CompanyRule.insertMany([
      { title: 'Ish vaqtidan 5 daqiqa oldin keling', category: 'attendance', content: 'Smena boshlanishidan kamida 5 daqiqa oldin do\'konda bo\'ling.', order: 1, isActive: true },
      { title: 'Mijoz bilan muloyim muomala', category: 'conduct', content: 'Har bir mijozni tabassum bilan kutib oling.', order: 2, isActive: true },
      { title: 'Kunlik savdoni kiriting', category: 'sales', content: 'Har kuni ketishdan oldin sotgan mahsulotlaringiz sonini ilovaga kiriting.', order: 3, isActive: true },
    ]);
  }
  logger.info('Jarima va kompaniya qoidalari tayyor');
}

async function ensureStores(): Promise<Array<typeof Store.prototype>> {
  const result: Array<typeof Store.prototype> = [];
  for (const s of STORES) {
    const store = await Store.findOneAndUpdate(
      { slug: s.slug },
      {
        $set: {
          name: s.name,
          slug: s.slug,
          hasBillz: true,
          workStartTime: '09:00',
          workEndTime: '21:00',
          weeklyTarget: s.weeklyTarget,
          monthlyTarget: s.weeklyTarget * 4,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    result.push(store);
  }
  logger.info({ stores: result.length }, 'Do\'konlar tayyor');
  return result;
}

type DemoUser = typeof User.prototype;

async function ensureUsers(stores: Array<typeof Store.prototype>): Promise<{
  employees: DemoUser[];
  manager: DemoUser;
}> {
  const empHash = await bcrypt.hash(DEMO_EMPLOYEE_PIN, env.BCRYPT_ROUNDS);
  const mgrHash = await bcrypt.hash(DEMO_MANAGER_PIN, env.BCRYPT_ROUNDS);

  // CEO — .env dagi telefon/PIN bilan mos (idempotent: qayta seed'da ham yangilanadi).
  const ceoPhone = process.env.CEO_PHONE ?? '998901234567';
  const ceoHash = await bcrypt.hash(process.env.CEO_PASSWORD ?? '1234', env.BCRYPT_ROUNDS);
  await User.findOneAndUpdate(
    { phone: ceoPhone },
    {
      $set: {
        phone: ceoPhone,
        firstName: process.env.CEO_FIRST_NAME ?? 'CEO',
        lastName: process.env.CEO_LAST_NAME ?? '',
        passwordHash: ceoHash,
        role: 'ceo',
        isApproved: true,
        isActive: true,
      },
    },
    { upsert: true },
  );

  // Menejer — barcha do'konlarni nazorat qiladi.
  const manager = await User.findOneAndUpdate(
    { phone: '998900000000' },
    {
      $set: {
        phone: '998900000000',
        firstName: 'Nazoratchi',
        lastName: 'Menejer',
        passwordHash: mgrHash,
        role: 'manager',
        // Menejer ofisda — do'kon biriktirilmaydi.
        storeId: null,
        division: null,
        isApproved: true,
        isActive: true,
      },
    },
    { upsert: true, new: true },
  );

  // Xodimlar — har do'konda 3 ta, bo'lim do'kon brendiga qarab.
  const employees: DemoUser[] = [];
  let phoneCounter = 1_000_001;
  let nameIdx = 0;
  for (let s = 0; s < stores.length; s++) {
    const store = stores[s]!;
    const spec = STORES[s]!;
    for (let e = 0; e < 3; e++) {
      const phone = `99890${phoneCounter}`;
      phoneCounter++;
      const firstName = FIRST_NAMES[nameIdx % FIRST_NAMES.length]!;
      const lastName = LAST_NAMES[nameIdx % LAST_NAMES.length]!;
      nameIdx++;
      const u = await User.findOneAndUpdate(
        { phone },
        {
          $set: {
            phone,
            firstName,
            lastName,
            passwordHash: empHash,
            role: 'employee',
            storeId: store._id,
            division: spec.division,
            isApproved: true,
            isActive: true,
          },
        },
        { upsert: true, new: true },
      );
      employees.push(u);
    }
  }
  logger.info({ employees: employees.length }, 'Foydalanuvchilar tayyor (PIN: xodim 1111, menejer 2222)');
  return { employees, manager };
}

async function seedSchedules(employees: DemoUser[]): Promise<void> {
  // Joriy hafta (dushanba-yakshanba) jadvali.
  const today = startOfTashkentDay();
  const dow = tashkentDow(today); // 0=yakshanba
  const mondayOffset = (dow + 6) % 7;
  const monday = addDays(today, -mondayOffset);

  let count = 0;
  for (let e = 0; e < employees.length; e++) {
    const emp = employees[e]!;
    for (let d = 0; d < 7; d++) {
      const date = addDays(monday, d);
      const weekDay = tashkentDow(date);
      let shift: ShiftType;
      if (weekDay === 0) shift = 'day_off'; // yakshanba dam
      else if (d === e % 6) shift = 'day_off'; // har xodimga haftada bitta dam
      else if (e % 5 === 0) shift = 'flexible';
      else shift = e % 2 === 0 ? 'morning' : 'evening';

      await schedulesService.setShift({
        userId: emp._id as never,
        storeId: emp.storeId as never,
        date,
        shiftType: shift,
        source: 'scheduled',
        assignedBy: null,
      });
      count++;
    }
  }
  logger.info({ count }, 'Joriy hafta jadvali tuzildi');
}

async function seedAttendance(employees: DemoUser[]): Promise<number> {
  const today = startOfTashkentDay();
  let inserted = 0;

  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const date = startOfTashkentDay(addDays(today, -offset));
    if (tashkentDow(date) === 0) continue; // yakshanba yopiq

    for (const emp of employees) {
      if (!emp.storeId) continue;

      // Dam olish (~1/hafta) — yozuv yo'q.
      if (maybe(0.14)) continue;

      // Kelmaslik (~6%) — absent yozuvi.
      if (maybe(0.06)) {
        try {
          await Attendance.create({
            userId: emp._id,
            storeId: emp.storeId,
            date,
            status: 'absent',
            shiftType: 'morning',
            penaltyAmount: 200_000,
            penaltyAccepted: maybe(0.4),
          });
          inserted++;
        } catch { /* dup */ }
        continue;
      }

      const shift: ShiftType = maybe(0.6) ? 'morning' : maybe(0.7) ? 'evening' : 'flexible';
      const def = SHIFTS[shift];
      const startStr = def.startTime ?? '09:00';
      const endStr = def.endTime ?? '19:00';

      const lateMin = maybe(0.16) ? rand(5, 40) : 0;
      const earlyMin = maybe(0.06) ? rand(5, 30) : 0;

      const startTime = tashkentTimeToday(startStr, date);
      const checkIn = new Date(startTime.getTime() + lateMin * 60_000 + rand(-180, 60) * 1000);
      const endTime = tashkentTimeToday(endStr, date);
      const checkOut = new Date(endTime.getTime() - earlyMin * 60_000 + rand(-60, 600) * 1000);

      // flexible — kech kelish/erta ketish hisoblanmaydi.
      const effLate = shift === 'flexible' ? 0 : lateMin;
      const effEarly = shift === 'flexible' ? 0 : earlyMin;

      let penalty = 0;
      if (effLate >= 5 && effLate <= 15) penalty = 50_000;
      else if (effLate >= 16 && effLate <= 30) penalty = 100_000;
      else if (effLate > 30) penalty = 200_000;
      if (effEarly >= 5) penalty += effEarly >= 30 ? 150_000 : 50_000;

      const status = effLate >= 5 ? 'late' : effEarly >= 5 ? 'left_early' : 'present';

      try {
        await Attendance.create({
          userId: emp._id,
          storeId: emp.storeId,
          date,
          shiftType: shift,
          checkIn,
          checkOut: offset === 0 && maybe(0.3) ? null : checkOut,
          lateMinutes: effLate,
          earlyLeaveMinutes: effEarly,
          penaltyAmount: penalty,
          penaltyAccepted: penalty > 0 && maybe(0.6),
          status,
        });
        inserted++;
      } catch { /* dup */ }
    }
  }
  return inserted;
}

async function seedSales(employees: DemoUser[]): Promise<number> {
  const today = startOfTashkentDay();
  let inserted = 0;
  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const date = startOfTashkentDay(addDays(today, -offset));
    if (tashkentDow(date) === 0) continue;

    for (const emp of employees) {
      if (!emp.storeId) continue;
      if (!maybe(0.7)) continue;
      const entries = rand(1, 2);
      for (let i = 0; i < entries; i++) {
        const qty = rand(1, 10);
        await Sale.create({
          userId: emp._id,
          storeId: emp.storeId,
          date,
          quantity: qty,
          amount: qty * rand(150_000, 800_000),
          source: 'manual',
        });
        inserted++;
      }
    }
  }
  return inserted;
}

async function seedBillz(stores: Array<typeof Store.prototype>): Promise<number> {
  const today = startOfTashkentDay();
  let inserted = 0;
  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const date = startOfTashkentDay(addDays(today, -offset));
    const dow = tashkentDow(date);
    if (dow === 0) continue;
    for (let s = 0; s < stores.length; s++) {
      const store = stores[s]!;
      const base = STORES[s]!.baseRevenue;
      const dayFactor = dow === 6 ? 1.5 : dow === 5 ? 1.3 : 1.0;
      const noise = 0.6 + Math.random() * 0.8;
      const totalAmount = Math.round(base * dayFactor * noise);
      const itemCount = Math.round(totalAmount / rand(150_000, 350_000));
      await BillzSale.updateOne(
        { storeId: store._id, date },
        { $set: { storeId: store._id, date, totalAmount, itemCount, transactionCount: Math.round(itemCount * 0.7), fetchedAt: new Date() } },
        { upsert: true },
      );
      inserted++;
    }
  }
  return inserted;
}

async function seedRewards(employees: DemoUser[], managerId: unknown): Promise<void> {
  const today = startOfTashkentDay();
  // Avto rag'batlar — haqiqiy job mantig'i bilan oxirgi 12 kun uchun.
  for (let offset = 12; offset >= 1; offset--) {
    await dailyRewardsJob(startOfTashkentDay(addDays(today, -offset)));
  }

  // Qo'lda rag'batlar — bir nechta (tasdiqlangan + kutilayotgan).
  const samples = [
    { emp: employees[1]!, amount: 100_000, reason: 'Oyning eng faol sotuvchisi', status: 'approved', initiatorRole: 'manager' },
    { emp: employees[4]!, amount: 70_000, reason: 'Mijozdan yaxshi izoh', status: 'approved', initiatorRole: 'manager' },
    { emp: employees[7]!, amount: 50_000, reason: 'Vitrinani chiroyli bezadi', status: 'pending', initiatorRole: 'manager' },
    { emp: employees[9]!, amount: 60_000, reason: 'Qo\'shimcha smenada ishladi', status: 'pending', initiatorRole: 'employee' },
  ];
  for (const s of samples) {
    await Reward.create({
      userId: s.emp._id,
      storeId: s.emp.storeId,
      division: s.emp.division,
      amount: s.amount,
      reason: s.reason,
      type: 'manual',
      status: s.status,
      date: today,
      requestedBy: managerId,
      initiatorRole: s.initiatorRole,
      decidedBy: s.status === 'approved' ? managerId : null,
      decidedAt: s.status === 'approved' ? new Date() : null,
    });
  }
  logger.info('Rag\'batlar (avto + qo\'lda) yaratildi');
}

async function seedTasks(employees: DemoUser[], managerId: unknown): Promise<void> {
  const today = startOfTashkentDay();
  const dubaiIds = employees.filter((e) => e.division === 'dubai_house').map((e) => e._id);
  const amirIds = employees.filter((e) => e.division === 'amir').map((e) => e._id);

  // 1) Bo'limga — bajarilmoqda
  await Task.create({
    title: 'Yangi kolleksiyani vitrinaga joylashtirish',
    description: 'Dubai House bo\'limidagi barcha do\'konlarda yangi mavsum mahsulotlarini old vitrinaga chiqaring.',
    createdBy: managerId,
    assigneeType: 'division',
    targetDivision: 'dubai_house',
    assignees: dubaiIds,
    deadline: addDays(today, 3),
    status: 'todo',
    priority: 'high',
  });

  // 2) Tanlangan xodimlarga — jarayonda, muddati o'tgan, muddat surish so'rovi bilan
  await Task.create({
    title: 'Oylik inventarizatsiya',
    description: 'Ombor va do\'kondagi mahsulotlarni sanab, hisobotni tayyorlang.',
    createdBy: managerId,
    assigneeType: 'user',
    assignees: amirIds.slice(0, 2),
    deadline: addDays(today, -1),
    status: 'in_progress',
    priority: 'normal',
    extensions: [
      {
        requestedBy: amirIds[0],
        requestedDeadline: addDays(today, 2),
        reason: 'Tovar ko\'p, ulgurmadik — 2 kun qo\'shsangiz',
        status: 'pending',
      },
    ],
  });

  // 3) Hammaga — bajarildi
  await Task.create({
    title: 'Xavfsizlik yo\'riqnomasini o\'qib chiqish',
    createdBy: managerId,
    assigneeType: 'all',
    assignees: employees.map((e) => e._id),
    startAt: addDays(today, -5),
    deadline: addDays(today, -2),
    status: 'done',
    completedAt: addDays(today, -3),
    completedBy: employees[0]!._id,
    priority: 'low',
  });

  // 4) Bo'limga — bajarilmoqda
  await Task.create({
    title: 'Kassa hisobotini kunlik yuborish',
    createdBy: managerId,
    assigneeType: 'division',
    targetDivision: 'amir',
    assignees: amirIds,
    deadline: addDays(today, 1),
    status: 'todo',
    priority: 'normal',
  });

  logger.info('Topshiriqlar yaratildi');
}

async function seedNotifications(employees: DemoUser[]): Promise<void> {
  const docs = [
    { userId: employees[0]!._id, type: 'task_assigned', title: 'Yangi topshiriq', body: 'Yangi kolleksiyani vitrinaga joylashtirish', link: '/tasks', isRead: false },
    { userId: employees[0]!._id, type: 'rule_published', title: 'Yangi qoida e\'lon qilindi', body: 'Kunlik savdoni kiriting', link: '/rules', isRead: true, readAt: new Date() },
    { userId: employees[1]!._id, type: 'reward_decided', title: 'Rag\'bat tasdiqlandi', body: '100 000 so\'m — Oyning eng faol sotuvchisi', link: '/rewards', isRead: false },
  ];
  await Notification.insertMany(docs);
  logger.info('Bildirishnomalar yaratildi');
}

async function main(): Promise<void> {
  await connectDatabase();
  try {
    await clearActivity();
    await seedRules();
    const stores = await ensureStores();
    const { employees, manager } = await ensureUsers(stores);

    await seedSchedules(employees);
    const [att, sales, billz] = await Promise.all([
      seedAttendance(employees),
      seedSales(employees),
      seedBillz(stores),
    ]);
    await seedRewards(employees, manager._id);
    await seedTasks(employees, manager._id);
    await seedNotifications(employees);

    logger.info({ att, sales, billz, days: DAYS }, '✅ To\'liq demo maʼlumotlar tayyor');
    console.log('\n========================================');
    console.log('  DEMO MAʼLUMOTLAR TAYYOR');
    console.log('========================================');
    console.log(`  Do'konlar:   ${stores.length}`);
    console.log(`  Xodimlar:    ${employees.length} (+1 menejer, +1 CEO)`);
    console.log(`  Davomat:     ${att} yozuv (${DAYS} kun)`);
    console.log(`  Savdo:       ${sales} yozuv`);
    console.log('  ----------------------------------------');
    console.log('  LOGIN:');
    console.log(`   CEO:     ${process.env.CEO_PHONE ?? '998901234567'} / ${process.env.CEO_PASSWORD ?? '1234'}`);
    console.log('   Menejer: 998900000000 / 2222');
    console.log('   Xodim:   998901000001 / 1111  (va boshqalar ...000002, ...000003)');
    console.log('========================================\n');
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'Demo seed xato');
  process.exit(1);
});

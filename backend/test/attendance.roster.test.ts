import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { attendancesService } from '../src/modules/attendances/attendances.service.js';
import { Attendance } from '../src/modules/attendances/attendances.model.js';
import { Schedule } from '../src/modules/schedules/schedules.model.js';
import { Store, type StoreDoc } from '../src/modules/stores/stores.model.js';
import { User, type UserDoc } from '../src/modules/users/users.model.js';
import { startOfTashkentDay } from '../src/core/utils/date.js';

// "now" ni qotiramiz — startOfTashkentDay() va yozuv sanasi mos bo'lishi uchun.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-05-21T07:00:00.000Z'));
});
afterAll(() => {
  vi.useRealTimers();
});

async function makeStore(name: string): Promise<StoreDoc> {
  return (await Store.create({
    name,
    slug: `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    workStartTime: '09:00',
    workEndTime: '18:00',
  })) as StoreDoc;
}

async function makeUser(
  storeId: unknown,
  firstName: string,
  over: Partial<{ role: 'employee' | 'manager' | 'ceo'; isActive: boolean; isApproved: boolean }> = {},
): Promise<UserDoc> {
  return (await User.create({
    firstName,
    phone: `9989${Math.floor(Math.random() * 1e7)}`,
    passwordHash: 'x',
    role: over.role ?? 'employee',
    storeId,
    isApproved: over.isApproved ?? true,
    isActive: over.isActive ?? true,
  })) as UserDoc;
}

async function addAttendance(
  userId: unknown,
  storeId: unknown,
  fields: {
    status: 'present' | 'late' | 'left_early' | 'absent';
    checkIn?: Date | null;
    checkOut?: Date | null;
    penaltyAmount?: number;
    shiftType?: string | null;
  },
): Promise<void> {
  await Attendance.create({
    userId,
    storeId,
    date: startOfTashkentDay(),
    status: fields.status,
    checkIn: fields.checkIn ?? null,
    checkOut: fields.checkOut ?? null,
    penaltyAmount: fields.penaltyAmount ?? 0,
    shiftType: fields.shiftType ?? null,
  });
}

describe('AttendancesService.getDailyRoster (summary sanog\'i)', () => {
  it('present/absent/late/day_off/fined ni to\'g\'ri sanaydi', async () => {
    const store = await makeStore('Markaz');
    const day = startOfTashkentDay();

    // present — keldi, jarima yo'q
    const present = await makeUser(store._id, 'Anvar');
    await addAttendance(present._id, store._id, {
      status: 'present',
      checkIn: new Date('2026-05-21T04:00:00.000Z'),
    });

    // late — keldi (present ham sanaladi), jarima bilan (fined)
    const late = await makeUser(store._id, 'Bobur');
    await addAttendance(late._id, store._id, {
      status: 'late',
      checkIn: new Date('2026-05-21T05:00:00.000Z'),
      penaltyAmount: 20_000,
    });

    // absent — kelmadi, jarima bilan (fined)
    const absent = await makeUser(store._id, 'Davron');
    await addAttendance(absent._id, store._id, {
      status: 'absent',
      penaltyAmount: 50_000,
    });

    // day_off — jadvalda dam olish, yozuv yo'q
    const dayOff = await makeUser(store._id, 'Elyor');
    await Schedule.create({
      userId: dayOff._id,
      storeId: store._id,
      date: day,
      shiftType: 'day_off',
    });

    // not_checked_in — smena bor, lekin hali kelmagan / yozuv yo'q (default smena)
    const pending = await makeUser(store._id, 'Farrux');
    await User.updateOne({ _id: pending._id }, { defaultShiftType: 'morning' });

    // chiqarib tashlanadiganlar: manager, faolsiz, tasdiqlanmagan
    await makeUser(store._id, 'Manager', { role: 'manager' });
    await makeUser(store._id, 'NoActive', { isActive: false });
    await makeUser(store._id, 'NoApprove', { isApproved: false });

    const roster = await attendancesService.getDailyRoster(day);

    expect(roster.summary.totalEmployees).toBe(5); // faqat faol/tasdiqlangan employee
    expect(roster.summary.present).toBe(2); // checkIn bor: Anvar + Bobur
    expect(roster.summary.absent).toBe(1); // Davron
    expect(roster.summary.late).toBe(1); // Bobur
    expect(roster.summary.leftEarly).toBe(0);
    expect(roster.summary.onDayOff).toBe(1); // Elyor
    expect(roster.summary.fined).toBe(2); // Bobur + Davron
    expect(roster.summary.totalPenalty).toBe(70_000);

    // qatorlar ism bo'yicha alifbo tartibida
    expect(roster.rows.map((r) => r.name)).toEqual([
      'Anvar',
      'Bobur',
      'Davron',
      'Elyor',
      'Farrux',
    ]);

    // statuslar
    const byName = new Map(roster.rows.map((r) => [r.name, r]));
    expect(byName.get('Anvar')!.status).toBe('present');
    expect(byName.get('Bobur')!.status).toBe('late');
    expect(byName.get('Davron')!.status).toBe('absent');
    expect(byName.get('Elyor')!.status).toBe('day_off');
    expect(byName.get('Elyor')!.isDayOff).toBe(true);
    expect(byName.get('Farrux')!.status).toBe('not_checked_in');

    expect(roster.date).toBe('2026-05-21');
  });
});

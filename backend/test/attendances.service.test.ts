import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import {
  attendancesService,
  AttendanceError,
} from '../src/modules/attendances/attendances.service.js';
import { Attendance } from '../src/modules/attendances/attendances.model.js';
import { Store, type StoreDoc } from '../src/modules/stores/stores.model.js';
import { User, type UserDoc } from '../src/modules/users/users.model.js';
import { PenaltyRule } from '../src/modules/penalties/penalties.model.js';
import { TIMEZONE } from '../src/core/config/constants.js';

// Pin "now" to 12:00 Asia/Tashkent (UTC+5 → 07:00 UTC) so the relative shift
// windows below never hit the near-midnight clamp and stay deterministic at any
// real wall-clock hour. Only Date is faked — timers/async/mongo stay real.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-05-21T07:00:00.000Z'));
});
afterAll(() => {
  vi.useRealTimers();
});

/** Current Tashkent wall-clock minute-of-day, used to build relative shifts. */
function tashkentMinutesNow(): number {
  const hhmm = formatInTimeZone(new Date(), TIMEZONE, 'HH:mm');
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
}

function hhmm(minutesOfDay: number): string {
  // Clamp into a valid same-day window so tests stay deterministic near midnight.
  const clamped = Math.min(23 * 60 + 30, Math.max(30, minutesOfDay));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function makeStore(over: Partial<{ workStartTime: string; workEndTime: string }> = {}) {
  const store = (await Store.create({
    name: 'Test Do‘kon',
    slug: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    workStartTime: over.workStartTime ?? '09:00',
    workEndTime: over.workEndTime ?? '18:00',
  })) as StoreDoc;
  return store;
}

async function makeUser(storeId: unknown) {
  return (await User.create({
    firstName: 'Xodim',
    phone: `9989${Math.floor(Math.random() * 1e7)}`,
    passwordHash: 'x',
    role: 'employee',
    storeId,
    isApproved: true,
    isActive: true,
  })) as UserDoc;
}

describe('AttendancesService.checkIn', () => {
  it('records an on-time check-in as present with no penalty (store-hours fallback)', async () => {
    // Shift starts 30 min from now → not late.
    const store = await makeStore({ workStartTime: hhmm(tashkentMinutesNow() + 30) });
    const user = await makeUser(store._id);

    const result = await attendancesService.checkIn(user._id, store);

    expect(result.isLate).toBe(false);
    expect(result.lateMinutes).toBe(0);
    expect(result.penaltyAmount).toBe(0);
    expect(result.attendance.status).toBe('present');
    expect(result.attendance.checkIn).not.toBeNull();

    const inDb = await Attendance.findOne({ userId: user._id });
    expect(inDb!.status).toBe('present');
  });

  it('flags a late check-in and applies the matching penalty rule', async () => {
    // Shift started 60 min ago → ~60 minutes late.
    const store = await makeStore({ workStartTime: hhmm(tashkentMinutesNow() - 60) });
    const user = await makeUser(store._id);
    await PenaltyRule.create({
      name: 'Kechikish 5+ daqiqa',
      type: 'late_arrival',
      minMinutes: 5,
      maxMinutes: null,
      amount: 20_000,
      isActive: true,
    });

    const result = await attendancesService.checkIn(user._id, store);

    expect(result.isLate).toBe(true);
    expect(result.lateMinutes).toBeGreaterThanOrEqual(55);
    expect(result.penaltyAmount).toBe(20_000);
    expect(result.attendance.status).toBe('late');
  });

  it('rejects a second check-in the same day with ALREADY_CHECKED_IN', async () => {
    const store = await makeStore({ workStartTime: hhmm(tashkentMinutesNow() + 30) });
    const user = await makeUser(store._id);

    await attendancesService.checkIn(user._id, store);

    await expect(attendancesService.checkIn(user._id, store)).rejects.toMatchObject({
      name: 'AttendanceError',
      code: 'ALREADY_CHECKED_IN',
    });
    expect(await Attendance.countDocuments({ userId: user._id })).toBe(1);
  });
});

describe('AttendancesService.checkOut', () => {
  it('records check-out after check-in and computes worked minutes', async () => {
    // Leaving AFTER the shift end (end in the past) → not early.
    const store = await makeStore({
      workStartTime: hhmm(tashkentMinutesNow() - 120),
      workEndTime: hhmm(tashkentMinutesNow() - 30),
    });
    const user = await makeUser(store._id);

    await attendancesService.checkIn(user._id, store);
    const out = await attendancesService.checkOut(user._id, store);

    expect(out.isEarly).toBe(false);
    expect(out.earlyLeaveMinutes).toBe(0);
    expect(out.workedMinutes).toBeGreaterThanOrEqual(0);
    expect(out.attendance.checkOut).not.toBeNull();
    expect(out.source).toBe('store');
  });

  it('refuses check-out when the user never checked in (NOT_CHECKED_IN)', async () => {
    const store = await makeStore();
    const user = await makeUser(store._id);

    await expect(attendancesService.checkOut(user._id, store)).rejects.toBeInstanceOf(
      AttendanceError,
    );
    await expect(attendancesService.checkOut(user._id, store)).rejects.toMatchObject({
      code: 'NOT_CHECKED_IN',
    });
  });

  it('refuses a second check-out with ALREADY_CHECKED_OUT', async () => {
    const store = await makeStore({
      workStartTime: hhmm(tashkentMinutesNow() - 120),
      workEndTime: hhmm(tashkentMinutesNow() - 30),
    });
    const user = await makeUser(store._id);

    await attendancesService.checkIn(user._id, store);
    await attendancesService.checkOut(user._id, store);

    await expect(attendancesService.checkOut(user._id, store)).rejects.toMatchObject({
      code: 'ALREADY_CHECKED_OUT',
    });
  });
});

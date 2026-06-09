import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { reportsService } from '../src/modules/reports/reports.service.js';
import type { DailyLeaderboard } from '../src/modules/reports/reports.service.js';
import { Sale } from '../src/modules/sales/sales.model.js';
import { Store, type StoreDoc } from '../src/modules/stores/stores.model.js';
import { User, type UserDoc } from '../src/modules/users/users.model.js';
import { startOfTashkentDay } from '../src/core/utils/date.js';

// "now" ni qotirib qo'yamiz — startOfTashkentDay() va savdo sanasi mos bo'lishi uchun.
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
  division: 'dubai_house' | 'amir' | null = null,
): Promise<UserDoc> {
  return (await User.create({
    firstName,
    phone: `9989${Math.floor(Math.random() * 1e7)}`,
    passwordHash: 'x',
    role: 'employee',
    storeId,
    division,
    isApproved: true,
    isActive: true,
  })) as UserDoc;
}

async function addSale(
  userId: unknown,
  storeId: unknown,
  quantity: number,
  source: 'manual' | 'billz' = 'manual',
): Promise<void> {
  await Sale.create({
    userId,
    storeId,
    date: startOfTashkentDay(),
    quantity,
    source,
  });
}

function div(board: DailyLeaderboard, division: 'dubai_house' | 'amir') {
  return board.employeesByDivision.find((d) => d.division === division)!;
}

describe('reportsService.dailyLeaderboard (bo\'lim bo\'yicha)', () => {
  it('xodimlarni bo\'lim bo\'yicha ajratadi, dona kamayishi bo\'yicha saralaydi', async () => {
    const storeA = await makeStore('A');
    const storeB = await makeStore('B');
    const u1 = await makeUser(storeA._id, 'Bir', 'dubai_house');
    const u2 = await makeUser(storeA._id, 'Ikki', 'dubai_house');
    const u3 = await makeUser(storeB._id, 'Uch', 'amir');
    const u4 = await makeUser(storeB._id, 'Tort', null); // bo'limsiz → chiqarib tashlanadi

    await addSale(u1._id, storeA._id, 3);
    await addSale(u2._id, storeA._id, 5);
    await addSale(u3._id, storeB._id, 4);
    await addSale(u4._id, storeB._id, 7); // bo'limsiz xodim
    await addSale(u2._id, storeA._id, 10, 'billz'); // Billz-manba → hisobga olinmaydi

    const board = await reportsService.dailyLeaderboard(u1._id);

    expect(board.employeesByDivision.map((d) => d.division)).toEqual([
      'dubai_house',
      'amir',
    ]);
    expect(div(board, 'dubai_house').label).toBe('Dubai House');
    expect(div(board, 'amir').label).toBe('Amir');

    expect(div(board, 'dubai_house').rows.map((e) => [e.fullName, e.count])).toEqual([
      ['Ikki', 5],
      ['Bir', 3],
    ]);
    expect(div(board, 'amir').rows.map((e) => [e.fullName, e.count])).toEqual([
      ['Uch', 4],
    ]);

    const allNames = board.employeesByDivision.flatMap((d) => d.rows.map((r) => r.fullName));
    expect(allNames).not.toContain('Tort');

    expect(board.me).toEqual({ count: 3, rank: 2, division: 'dubai_house' });
    expect(div(board, 'dubai_house').rows.find((e) => e.fullName === 'Bir')?.isMe).toBe(true);

    expect(board.stores.map((s) => [s.storeName, s.count])).toEqual([
      ['B', 11],
      ['A', 8],
    ]);
  });

  it('savdosi yo\'q kuzatuvchini chiqarmaydi va me=null qaytaradi', async () => {
    const store = await makeStore('Solo');
    const seller = await makeUser(store._id, 'Sotuvchi', 'amir');
    const viewer = await makeUser(store._id, 'Kuzatuvchi', 'amir');

    await addSale(seller._id, store._id, 4);

    const board = await reportsService.dailyLeaderboard(viewer._id);

    const allNames = board.employeesByDivision.flatMap((d) => d.rows.map((r) => r.fullName));
    expect(allNames).not.toContain('Kuzatuvchi');
    expect(div(board, 'amir').rows.map((e) => e.fullName)).toEqual(['Sotuvchi']);
    expect(board.me).toEqual({ count: 0, rank: null, division: null });
  });
});

# Reytingni bo'lim bo'yicha ajratish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kunlik reytingdagi *xodimlar aro* qismni `division` (Dubai House / Amir) bo'yicha ikkita mustaqil ro'yxatga ajratish — Telegram matni, `/reyting` sahifasi va dashboard kartasida.

**Architecture:** Backend `dailyLeaderboard()` tekis `employees[]` o'rniga `employeesByDivision[]` (doim ikkala bo'lim, `dubai_house` → `amir`) qaytaradi; `me` o'z bo'limi ichidagi rank + `division` oladi. `null`/boshqa bo'lim xodimlar chiqarib tashlanadi. Backend va frontend tiplari alohida fayllarda — kontrakt bir xil. Telegram matni har bo'lim sarlavhasi + rag'bat satrini chiqaradi.

**Tech Stack:** TypeScript (ESM, `.js` import kengaytmalari), Express 5, Mongoose, Next.js 15 / React 19, Vitest.

> ⚠️ **Git yo'q:** Bu repo git emas (`Is a git repository: false`). Har task oxiridagi "commit" o'rniga **tekshiruv nuqtasi** (typecheck/test/lint toza) bajariladi — `git add/commit` ishlatilmaydi.

> 📐 To'liq kontrakt va qarorlar: `docs/superpowers/specs/2026-06-09-leaderboard-by-division-design.md`.

---

## Fayl tuzilishi

**Backend (Agent A):**
- Modify: `backend/src/modules/reports/reports.service.ts` — `DailyLeaderboard` interfeysi + `DivisionLeaderboard`; `dailyLeaderboard()` va `formatDailyLeaderboardText()`.
- Modify: `backend/api/routes/reports.ts:14-26` — javob maydoni.
- Test: `backend/test/reports.leaderboard.test.ts` — yangi shaklga qayta yoziladi.

**Frontend (Agent B):**
- Modify: `frontend/components/leaderboard.tsx` — tiplar + `LeaderboardFull` + `LeaderboardCard`.
- Modify: `frontend/app/(dashboard)/reyting/page.tsx` — mapping.
- Modify: `frontend/app/(dashboard)/dashboard/page.tsx:74-78` — mapping.

Backend (Task 1) va Frontend (Task 2) bir-biriga bog'liq emas (umumiy import yo'q) — kontrakt qulflangach parallel bajariladi.

---

## Task 1: Backend — `dailyLeaderboard` va Telegram matni (Agent A)

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/api/routes/reports.ts`
- Test: `backend/test/reports.leaderboard.test.ts`

- [ ] **Step 1: Testni yangi shaklga qayta yozish (failing test)**

`backend/test/reports.leaderboard.test.ts` ni to'liq quyidagiga almashtir:

```ts
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

describe('reportsService.dailyLeaderboard (bo'lim bo'yicha)', () => {
  it('xodimlarni bo'lim bo'yicha ajratadi, dona kamayishi bo'yicha saralaydi', async () => {
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

    // Doim ikkala bo'lim, qat'iy tartibda.
    expect(board.employeesByDivision.map((d) => d.division)).toEqual([
      'dubai_house',
      'amir',
    ]);
    expect(div(board, 'dubai_house').label).toBe('Dubai House');
    expect(div(board, 'amir').label).toBe('Amir');

    // Bo'lim ichida kamayish tartibida.
    expect(div(board, 'dubai_house').rows.map((e) => [e.fullName, e.count])).toEqual([
      ['Ikki', 5],
      ['Bir', 3],
    ]);
    expect(div(board, 'amir').rows.map((e) => [e.fullName, e.count])).toEqual([
      ['Uch', 4],
    ]);

    // Bo'limsiz (Tort) butunlay yo'q.
    const allNames = board.employeesByDivision.flatMap((d) => d.rows.map((r) => r.fullName));
    expect(allNames).not.toContain('Tort');

    // "me" — u1 (Bir) o'z bo'limi (dubai_house) ichida 2-o'rin, 3 dona.
    expect(board.me).toEqual({ count: 3, rank: 2, division: 'dubai_house' });
    expect(div(board, 'dubai_house').rows.find((e) => e.fullName === 'Bir')?.isMe).toBe(true);

    // Do'konlar aro o'zgarmaydi — A = 8, B = 4 + 7 = 11.
    expect(board.stores.map((s) => [s.storeName, s.count])).toEqual([
      ['B', 11],
      ['A', 8],
    ]);
  });

  it('savdosi yo'q kuzatuvchini chiqarmaydi va me=null qaytaradi', async () => {
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
```

- [ ] **Step 2: Testni ishga tushir — fail bo'lishini tasdiqla**

Run: `cd backend && npx vitest run test/reports.leaderboard.test.ts`
Expected: FAIL — `employeesByDivision` mavjud emas / `DailyLeaderboard` da bunday maydon yo'q (TS/runtime xato).

- [ ] **Step 3: `reports.service.ts` — import va interfeyslar**

Faylning yuqorisidagi importlar qatoriga (boshqa importlardan keyin) qo'sh:

```ts
import { DIVISIONS, DIVISION_LABELS, type Division } from '../../core/config/constants.js';
```

`LeaderboardEmployeeRow` interfeysidan keyin yangi interfeys qo'sh va `DailyLeaderboard` ni yangila:

```ts
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
```

(Eski `employees: LeaderboardEmployeeRow[];` qatori `DailyLeaderboard` dan olib tashlanadi.)

- [ ] **Step 4: `dailyLeaderboard()` ichini yangila**

`dailyLeaderboard` da `const userIds = ...` dan to `return { ... }` gacha bo'lgan blokni quyidagiga almashtir (eng yuqoridagi `baseMatch` va `storeAgg/userAgg` `Promise.all` qismi O'ZGARMAYDI):

```ts
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
```

- [ ] **Step 5: Testni ishga tushir — `dailyLeaderboard` o'tishini tasdiqla**

Run: `cd backend && npx vitest run test/reports.leaderboard.test.ts`
Expected: PASS (ikkala test).

- [ ] **Step 6: `formatDailyLeaderboardText()` ni bo'limga moslab yangila**

`formatDailyLeaderboardText` metodini to'liq quyidagiga almashtir:

```ts
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

    let text = `\n🏆 *REYTING* — sotilgan dona bo'yicha\n`;
    text += '━━━━━━━━━━━━━━━━━━\n';

    if (board.stores.length > 0) {
      text += '*Do‘konlar aro:*\n';
      board.stores.forEach((s, i) => {
        text += `${storeIcon(i)} ${s.storeName} — ${s.count} dona\n`;
      });
    }

    for (const d of board.employeesByDivision) {
      text += `\n🏪 *${d.label} bo‘limi:*\n`;
      if (d.rows.length === 0) {
        text += '— hali savdo yo‘q\n';
        continue;
      }
      d.rows.slice(0, employeeLimit).forEach((e, i) => {
        text += `${empIcon(i)} ${e.fullName} — ${e.count} dona\n`;
      });
    }

    if (hasEmployees) {
      text +=
        '\n✨ Katta natijalar siz kabi xarakatdan to‘xtamaydigan insonlar bilan quriladi. Katta rahmat sizlarga!\n';
    }

    return text;
  }
```

- [ ] **Step 7: `reports.ts` route javobini yangila**

`backend/api/routes/reports.ts` ichidagi `res.json({ ... })` da `employees: board.employees,` qatorini quyidagiga almashtir:

```ts
      employeesByDivision: board.employeesByDivision,
```

(Qolgan maydonlar — `ok`, `date`, `stores`, `me` — o'zgarmaydi.)

- [ ] **Step 8: Backend tekshiruv nuqtasi (typecheck + test)**

Run: `cd backend && npx tsc --noEmit`
Expected: xatosiz (0 error).

Run: `cd backend && npx vitest run test/reports.leaderboard.test.ts`
Expected: PASS (2 test).

> Git yo'q — commit qilinmaydi. Tekshiruv toza bo'lsa, Task 1 tugadi.

---

## Task 2: Frontend — `leaderboard.tsx` + sahifalar (Agent B)

**Files:**
- Modify: `frontend/components/leaderboard.tsx`
- Modify: `frontend/app/(dashboard)/reyting/page.tsx`
- Modify: `frontend/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: `leaderboard.tsx` — import va tiplar**

Fayl boshidagi importlarga qo'sh (mavjud importlardan keyin):

```ts
import { DIVISION_LABELS, type Division } from '@/shared/types';
```

`LeaderboardEmployee` interfeysidan keyin yangi interfeys qo'sh va `LeaderboardData` ni yangila (eski `employees: LeaderboardEmployee[];` qatorini olib tashla):

```ts
export interface DivisionLeaderboard {
  division: Division;
  label: string;
  rows: LeaderboardEmployee[];
}

export interface LeaderboardData {
  stores: LeaderboardStore[];
  employeesByDivision: DivisionLeaderboard[];
  me: { count: number; rank: number | null; division: Division | null };
}
```

- [ ] **Step 2: `LeaderboardCard` ni bo'limga moslab yangila**

`LeaderboardCard` funksiyasini to'liq quyidagiga almashtir:

```tsx
export function LeaderboardCard({
  data,
  limit = 3,
}: {
  data: LeaderboardData;
  limit?: number;
}): React.ReactElement {
  const { stores, employeesByDivision, me } = data;
  const filledDivisions = employeesByDivision.filter((d) => d.rows.length > 0);
  const hasData = stores.length > 0 || filledDivisions.length > 0;

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-2)]">
          <Trophy className="size-[14px]" />
          Bugungi reyting
        </span>
        <Link
          href="/reyting"
          className="flex items-center gap-0.5 text-[11.5px] font-medium text-[color:var(--ink-3)] hover:text-[color:var(--ink-1)]"
        >
          To&apos;liq
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {!hasData ? (
        <EmptyHint />
      ) : (
        <div className="mt-3 space-y-3">
          {stores.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-3)] mb-0.5">
                Do&apos;konlar aro
              </div>
              <div className="divide-y divide-[color:var(--border)]">
                {stores.slice(0, limit).map((s, i) => (
                  <StoreRow key={s.storeId} store={s} index={i} />
                ))}
              </div>
            </div>
          )}

          {filledDivisions.map((d) => (
            <div key={d.division}>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-3)] mb-0.5">
                {d.label}
              </div>
              <div className="divide-y divide-[color:var(--border)]">
                {d.rows.slice(0, limit).map((e, i) => (
                  <EmployeeRow key={e.userId} emp={e} index={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {me.rank !== null && (
        <div className="mt-3 px-3.5 py-2.5 rounded-[10px] bg-[color:var(--background-2)] text-[12px] text-[color:var(--ink-2)]">
          {me.division ? `${DIVISION_LABELS[me.division]} bo‘limida ` : ''}
          o&apos;rning: <span className="font-semibold text-[color:var(--ink-1)]">{me.rank}</span>
          {' · '}
          <span className="font-semibold text-[color:var(--ink-1)]">{me.count}</span> dona
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: `LeaderboardFull` ni bo'limga moslab yangila**

`LeaderboardFull` funksiyasini to'liq quyidagiga almashtir:

```tsx
export function LeaderboardFull({ data }: { data: LeaderboardData }): React.ReactElement {
  const { stores, employeesByDivision } = data;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-3">
          <Trophy className="size-[15px] text-[color:var(--ink-3)]" />
          Do&apos;konlar aro
        </div>
        {stores.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {stores.map((s, i) => (
              <StoreRow key={s.storeId} store={s} index={i} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-3">
          <Trophy className="size-[15px] text-[color:var(--ink-3)]" />
          Xodimlar aro
        </div>
        <div className="space-y-4">
          {employeesByDivision.map((d) => (
            <div key={d.division}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-3)] mb-1">
                {d.label}
              </div>
              {d.rows.length === 0 ? (
                <p className="text-[12.5px] text-[color:var(--ink-3)] py-1">
                  Hali savdo yo&apos;q.
                </p>
              ) : (
                <div className="divide-y divide-[color:var(--border)]">
                  {d.rows.map((e, i) => (
                    <EmployeeRow key={e.userId} emp={e} index={i} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: `reyting/page.tsx` mapping**

`frontend/app/(dashboard)/reyting/page.tsx` da `const data: LeaderboardData = { ... }` blokini quyidagiga almashtir:

```ts
  const data: LeaderboardData = {
    stores: res.stores ?? [],
    employeesByDivision: res.employeesByDivision ?? [],
    me: res.me ?? { count: 0, rank: null, division: null },
  };
```

Shu faylda me banneri (`{data.me.rank !== null && ( ... )}`) ni bo'lim yorlig'i bilan yangila:

```tsx
      {data.me.rank !== null && (
        <div className="px-4 py-3 rounded-[12px] bg-[color:var(--background-2)] text-[13px] text-[color:var(--ink-2)]">
          {data.me.division ? `${DIVISION_LABELS[data.me.division]} bo‘limida ` : 'Sizning o‘rningiz: '}
          <span className="font-semibold text-[color:var(--ink-1)]">{data.me.rank}-o&apos;rin</span>
          {' · '}
          <span className="font-semibold text-[color:var(--ink-1)]">{data.me.count}</span> dona
        </div>
      )}
```

Faylning yuqorisidagi importlarga qo'sh:

```ts
import { DIVISION_LABELS } from '@/shared/types';
```

- [ ] **Step 5: `dashboard/page.tsx` mapping**

`frontend/app/(dashboard)/dashboard/page.tsx:74-78` dagi `const leaderboard: LeaderboardData = { ... }` blokini quyidagiga almashtir:

```ts
  const leaderboard: LeaderboardData = {
    stores: leaderboardRes.stores ?? [],
    employeesByDivision: leaderboardRes.employeesByDivision ?? [],
    me: leaderboardRes.me ?? { count: 0, rank: null, division: null },
  };
```

- [ ] **Step 6: Frontend tekshiruv nuqtasi (typecheck + lint)**

Run: `cd frontend && npx tsc --noEmit`
Expected: xatosiz (0 error).

Run: `npm run lint --prefix frontend`
Expected: xatosiz (yoki faqat oldindan mavjud ogohlantirishlar).

> Git yo'q — commit qilinmaydi. Tekshiruv toza bo'lsa, Task 2 tugadi.

---

## Task 3: Yakuniy integratsiya tekshiruvi (Orkestrator)

**Files:** (yangi o'zgarish yo'q — faqat tekshiruv)

- [ ] **Step 1: To'liq typecheck (backend + frontend)**

Run: `npm run typecheck`
Expected: ikkala loyiha ham xatosiz.

- [ ] **Step 2: Backend testlari**

Run: `cd backend && npx vitest run`
Expected: barcha testlar PASS (jumladan `reports.leaderboard.test.ts`).

- [ ] **Step 3: Telegram matnini ko'z bilan tekshirish**

Run: `npm run job daily-report --prefix backend`
Expected: log/matnда har bo'lim sarlavhasi (`🏪 Dubai House bo'limi:`, `🏪 Amir bo'limi:`) + oxirida rag'bat satri (`✨ Katta natijalar ...`). Bo'sh bo'lim bo'lsa `— hali savdo yo'q`.

> ℹ️ Bu job DB va (ixtiyoriy) Telegram sozlamasiga bog'liq. Telegram sozlanmagan bo'lsa, jo'natish no-op — lekin matn tuzilishi loglardan/koddan ko'rinadi. DB bo'sh bo'lsa, demo data (`npm run seed:demo`) bilan tekshirish mumkin.

- [ ] **Step 4: REJA.md ni yangilash**

`REJA.md` da faol vazifani bajarilgan deb belgila (✅ bo'limga ko'chir, qisqacha natija + sana 2026-06-09).

---

## Self-Review (reja muallifi tomonidan)

**Spec qamrovi:**
- employees → employeesByDivision (Task 1 Step 3-4, Task 2 Step 1) ✓
- null-bo'lim yashirish (Task 1 Step 4 `continue`; test Step 1) ✓
- me.rank o'z bo'limi ichida + me.division (Task 1 Step 4; test) ✓
- ikkala bo'lim doim (DIVISIONS map; LeaderboardFull har doim ikkalasi) ✓
- bo'sh bo'lim: Full = sarlavha + "hali savdo yo'q"; Card = yashirin; Telegram = "hali savdo yo'q" ✓
- Telegram rag'bat satri (Task 1 Step 6) ✓
- do'konlar aro tegmaydi (storeAgg/StoreRow o'zgarmaydi) ✓
- test yangilanadi (Task 1 Step 1) ✓

**Placeholder skani:** TODO/TBD yo'q; har kod qadami to'liq kod bilan. ✓

**Tip muvofiqligi:** `DivisionLeaderboard`/`LeaderboardData`/`me.division` backend va frontendda bir xil shakl; `Division` = `'dubai_house' | 'amir'` ikkala tomonda. `employeesByDivision` nomi hamma joyda bir xil. ✓

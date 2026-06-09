# Xodimlar aro reytingni bo'lim (division) bo'yicha ajratish — Dizayn

**Sana:** 2026-06-09
**Holat:** Tasdiqlangan (foydalanuvchi ko'rigida)

## Maqsad

Kunlik reytingdagi **xodimlar aro** qism `division` bo'yicha ikkiga ajratilsin:
**Dubai House** va **Amir** — har biri o'z ichida dona soni bo'yicha mustaqil
reyting (🥇🥈🥉 + ▪️). **Do'konlar aro** reyting o'zgarmaydi.

Tegadigan yuzalar:
1. Telegram kunlik hisoboti (`formatDailyLeaderboardText`).
2. `/reyting` sahifasi (`LeaderboardFull`).
3. Dashboard ixcham karta (`LeaderboardCard`).

## Qabul qilingan qarorlar

| # | Savol | Qaror |
|---|-------|-------|
| 1 | `division: null` xodimlar | **Yashiriladi** — reytingda umuman ko'rinmaydi |
| 2 | API javob shakli | `employees` **olib tashlanadi**, `employeesByDivision` qo'shiladi |
| 3 | `me.rank` (o'z o'rni) | **O'z bo'limi ichida** hisoblanadi |
| 4 | Bo'sh bo'lim | Sarlavha **doim** ko'rinadi; bo'sh bo'lsa "hali savdo yo'q" |
| 5 | Telegram rag'bat satri | **Qo'shiladi** (`✨ Katta natijalar...`) |

## Ma'lumot shakli (kontrakt)

Backend `DailyLeaderboard` (`reports.service.ts`) va frontend `LeaderboardData`
(`leaderboard.tsx`) bir xil shaklga keladi:

```ts
interface LeaderboardEmployeeRow {  // o'zgarmaydi
  userId: string;
  fullName: string;
  count: number;
  isMe: boolean;
}

interface DivisionLeaderboard {
  division: 'dubai_house' | 'amir';
  label: string;                 // 'Dubai House' | 'Amir'
  rows: LeaderboardEmployeeRow[]; // bo'lim ICHIDA count kamayish tartibida
}

interface DailyLeaderboard {
  date: Date;
  stores: LeaderboardStoreRow[];          // O'ZGARMAYDI
  employeesByDivision: DivisionLeaderboard[]; // employees[] o'rniga
  me: { count: number; rank: number | null; division: 'dubai_house' | 'amir' | null };
}
```

**Qoidalar:**
- `employeesByDivision` **doim ikkala bo'limni** qat'iy tartibda qaytaradi:
  `dubai_house`, keyin `amir`. Bo'lim bo'sh bo'lsa ham `rows: []` bilan qaytadi.
- `division` qiymati `'dubai_house'`/`'amir'` bo'lmagan (jumladan `null`)
  xodimlar **butunlay chiqarib tashlanadi**.
- `me.rank` = joriy foydalanuvchining **o'z bo'limi `rows` ichidagi** o'rni
  (1-indeksli). Bo'limi yo'q yoki savdosi yo'q bo'lsa `null`.
- `me.division` = joriy foydalanuvchi bo'limi (UI'da "Amir bo'limida 2-o'rin"
  matni uchun); savdosi/bo'limi yo'q bo'lsa `null`.
- `stores` (do'konlar aro) tegmaydi.

## Komponentlar bo'yicha o'zgarishlar

### Backend — `backend/src/modules/reports/reports.service.ts`
- `DailyLeaderboard` interfeysi yangilanadi (+ `DivisionLeaderboard`).
- `dailyLeaderboard()`:
  - `userAgg` (userId bo'yicha guruh) o'zgarmaydi.
  - `User.find(...).select('firstName lastName division')` — `division` qo'shiladi.
  - Natija ikki bucketga taqsimlanadi (faqat `dubai_house` / `amir`); har bucket
    `count` kamayishi bo'yicha saralanadi. `null`/boshqa bo'lim tashlanadi.
  - Chiqish: `DIVISIONS` tartibida `employeesByDivision` (ikkala bo'lim doim).
  - `me`: foydalanuvchi bo'limi topiladi; rank o'sha bo'limning `rows` ichida.
    Bo'lim/savdo yo'q → `{ count: 0, rank: null, division: null }`.
- `formatDailyLeaderboardText()`:
  - "Xodimlar aro" bitta ro'yxat o'rniga, har bo'lim uchun:
    `🏪 {label} bo'limi:` sarlavha + 🥇🥈🥉/`N.` qatorlar.
  - Bo'sh bo'lim: sarlavha + `— hali savdo yo'q` satri.
  - Oxirida rag'bat satri:
    `✨ Katta natijalar siz kabi xarakatdan to'xtamaydigan insonlar bilan quriladi. Katta rahmat sizlarga!`
  - Do'konlar aro qismi va umumiy sarlavha (`🏆 REYTING`) o'zgarmaydi.

### Backend — `backend/api/routes/reports.ts`
- `GET /api/reports/leaderboard` javobida `employees: board.employees` →
  `employeesByDivision: board.employeesByDivision`. (`me`, `stores`, `date` shu holicha.)

### Frontend — `frontend/components/leaderboard.tsx`
- `LeaderboardData` + `DivisionLeaderboard` tiplar yangilanadi; `me`'ga
  `division` qo'shiladi.
- `LeaderboardFull`: "Xodimlar aro" kartasi ichida ikki bo'lim bloki
  (har biri: bo'lim sarlavhasi + `EmployeeRow`lar yoki bo'sh holat eslatmasi).
  Reyting indeksi **har bo'lim ichida 0 dan** boshlanadi (medallar bo'lim ichida).
- `LeaderboardCard`: ixcham ko'rinishda bo'limlar ketma-ket (har biri `limit`
  qator). Joy tejash uchun ixcham kartada **faqat savdosi bor bo'limlar**
  ko'rsatiladi (bo'sh bo'lim sarlavhasi tashlab yuboriladi); umuman savdo
  bo'lmasa, hozirgidek `EmptyHint`. (Q4 "doim ikkala sarlavha" qoidasi to'liq
  `/reyting` sahifasidagi `LeaderboardFull`ga tegishli.)
- `EmployeeRow` / `StoreRow` / `rankBadge` / `EmptyHint` qayta ishlatiladi.
- me banneri: bo'lim yorlig'i bilan — masalan "Amir bo'limida 2-o'rin".

### Frontend — sahifalar
- `frontend/app/(dashboard)/reyting/page.tsx`: `LeaderboardResp` va mapping
  `employees` → `employeesByDivision`; default `[]`.
- `frontend/app/(dashboard)/dashboard/page.tsx`: shu mapping; `me` default'ga
  `division: null`.

### Test — `backend/test/reports.leaderboard.test.ts`
- `makeUser`'ga `division` parametri qo'shiladi.
- Assertlar yangi shaklga: `board.employeesByDivision` ichidan tegishli bo'lim
  topib `rows` tekshiriladi; bo'lim ichidagi rank va `isMe` tasdiqlanadi;
  `null`-bo'lim xodim chiqarib tashlanishi tekshiriladi.
- (Eski izohlardagi "50 000 so'm narx filtri" allaqachon yo'q — moslab yangilanadi.)

## Subagent orkestratsiyasi

Backend va frontend tiplari alohida fayllarda (umumiy import yo'q), shuning
uchun kontrakt belgilangach ish parallel bajariladi:

1. **Orkestrator (men):** yuqoridagi kontraktni qulflayman (aniq tip matnlari).
2. **Agent A — Backend:** `reports.service.ts` + `reports.ts` + test;
   tekshirish: `npm run typecheck --prefix backend` (yoki root typecheck) +
   `cd backend && npx vitest run test/reports.leaderboard.test.ts`.
3. **Agent B — Frontend:** `leaderboard.tsx` + 2 sahifa;
   tekshirish: frontend `tsc --noEmit` + `npm run lint`.
4. **Orkestrator yakuniy tekshiruv:** `npm run typecheck` (ikkalasi),
   `npm run job daily-report` matni namunaga mosligini ko'rish.

## Tugagach tekshirish (REJA.md mezonlari)
- `npm run typecheck` (backend + frontend) — toza.
- `cd backend && npx vitest run test/reports.leaderboard.test.ts` — o'tadi.
- `/reyting` — ikkita bo'lim alohida ko'rinadi.
- `npm run job daily-report` — Telegram matni namunadek (ikki bo'lim + rag'bat satri).

## Qamrovdan tashqari (YAGNI)
- Do'konlar aro reyting o'zgarmaydi.
- Yangi sozlama/parametr yo'q — bo'limlar `DIVISIONS` konstantasidan.
- Pul/summa hech qayerda qayta kiritilmaydi (dona bo'yicha qoladi).

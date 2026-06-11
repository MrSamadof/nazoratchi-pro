# Spec — CEO sidebar: "Operatsion panel" o'rniga Topshiriqlar + Xodimlar davomati

**Sana:** 2026-06-11
**Holat:** Tasdiqlandi (foydalanuvchi)

## Maqsad

CEO sidebaridagi **"Operatsion panel"** (`/dashboard`ga havola) olib tashlanadi va o'rniga ikkita bo'lim qo'shiladi:

1. **Topshiriqlar** (`/ceo/tasks`) — mavjud topshiriqlar doskasi CEO panelida.
2. **Xodimlar davomati** (`/ceo/attendance`) — CEO har bir xodimni nazorat qiladi: kim nechida keldi, nechida ketdi; bugun nechta keldi, nechta kelmadi, nechtasi jarimada, nechtasi dam olishda.

Til: barchasi **o'zbekcha (lotin)**. Vaqt zonasi: **Asia/Tashkent** (`backend/src/core/utils/date.ts` helperlari). Pul yo'q — bu davomat/jarima nazorati.

---

## 1. Sidebar o'zgarishi

**Fayl:** `frontend/components/ceo/ceo-sidebar.tsx` — `NAV` massivi (31–41-qatorlar).
**Fayl:** `frontend/components/ceo/ceo-mobile-nav.tsx` — mobil navigatsiya (xuddi shu havolalar ro'yxatini saqlaydi, yangilanishi shart).

`NAV`dan olib tashlanadi:
```ts
{ href: '/dashboard', label: 'Operatsion panel', icon: LayoutDashboard },
```
O'rniga (`Sozlamalar`dan oldin) qo'shiladi:
```ts
{ href: '/ceo/tasks',      label: 'Topshiriqlar',      icon: ClipboardList },
{ href: '/ceo/attendance', label: 'Xodimlar davomati', icon: CalendarCheck },
```
`lucide-react`dan `ClipboardList`, `CalendarCheck` import qilinadi; ishlatilmay qolgan `LayoutDashboard` olib tashlanadi. Aktivlik tekshiruvi `pathname.startsWith(item.href)` allaqachon to'g'ri ishlaydi.

---

## 2. Topshiriqlar — `/ceo/tasks`

**Yangi backend ishi YO'Q.** Mavjud `tasks` modul, `/api/tasks` route va `frontend/services/tasksApi.ts` to'liq yetarli. CEO `requireManager` huquqlariga ega — yaratish, biriktirish, holat o'zgartirish, muddat tasdiqlash ishlaydi.

**Yangi fayl:** `frontend/app/(ceo)/ceo/tasks/page.tsx`
- Server Component, `export const dynamic = 'force-dynamic'`.
- `const user = await requireCeoSession()` (`@/lib/session`).
- Mavjud `TasksBoard` (`@/features/tasks/components/tasks-board`) ni `role={user.role}` bilan render qiladi.
- Sarlavha: "Topshiriqlar". `(ceo)` sahifalaridagi padding uslubiga mos (`p-4 sm:p-6 lg:p-8` — `team/page.tsx`ga qarang).

---

## 3. Xodimlar davomati — `/ceo/attendance` (asosiy yangi ish)

### 3.1. Backend — yangi servis metodlari

**Fayl:** `backend/src/modules/attendances/attendances.service.ts`

#### `getDailyRoster(date: Date)`
Berilgan kun uchun barcha xodimlar holatini qaytaradi.

Mantiq:
1. `User.find({ isActive: true, isApproved: true, role: 'employee' })` — `storeId`, `firstName`, `lastName`, `division` bilan. (Faqat `employee` roli — menejer/CEO emas. Eslatma: `markAbsentees` `manager`ni ham qamraydi, lekin bu CEO nazorat ko'rinishi xodimlarga qaratilgan.)
2. O'sha kun `Attendance.find({ date: startOfTashkentDay(date) })` — `storeId` populate `name` bilan; `userId` bo'yicha Map ga joylash.
3. Har bir xodim uchun:
   - Attendance yozuvi bo'lsa: `checkIn`, `checkOut`, `lateMinutes`, `earlyLeaveMinutes`, `status`, `penaltyAmount`, `shiftType`.
   - Yozuv bo'lmasa: `schedulesService.getShiftWindow(emp._id, day)` orqali `isDayOff` aniqlanadi. Agar `isDayOff` bo'lsa status `day_off`, aks holda yozuv yo'qligi `not_checked_in` (kelishi kutilgan, lekin hali yo'q) deb belgilanadi.
   - `isDayOff` har doim `getShiftWindow` orqali aniqlanadi (yozuv bor bo'lsa ham — `day_off` smenada kelganlar uchun).
4. `summary` hisoblanadi:
   - `totalEmployees` — jami faol xodim.
   - `present` — `checkIn` bor xodimlar soni (kech kelganlar ham kiradi).
   - `absent` — `status === 'absent'`.
   - `late` — `status === 'late'`.
   - `leftEarly` — `status === 'left_early'`.
   - `fined` — `penaltyAmount > 0` bo'lgan xodimlar soni.
   - `onDayOff` — `isDayOff === true` bo'lgan xodimlar soni.
   - `totalPenalty` — barcha `penaltyAmount` yig'indisi.

**Qaytadigan tur (servis):**
```ts
interface RosterRow {
  userId: string;
  name: string;            // "Familiya Ism"
  storeName: string | null;
  division: string | null;
  shiftType: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: 'present' | 'late' | 'left_early' | 'absent' | 'day_off' | 'not_checked_in';
  penaltyAmount: number;
  isDayOff: boolean;
}
interface DailyRoster {
  date: string;            // YYYY-MM-DD (Tashkent)
  summary: {
    totalEmployees: number; present: number; absent: number; late: number;
    leftEarly: number; fined: number; onDayOff: number; totalPenalty: number;
  };
  rows: RosterRow[];       // ism bo'yicha alifbo tartibida
}
```

#### `getEmployeeHistory(userId: Types.ObjectId, from: Date, to: Date)`
Mavjud `getHistory`ga o'xshash, lekin CEO uchun istalgan xodim bo'yicha + har kun uchun `isDayOff` (yozuv yo'q kunlarni ko'rsatish shart emas — faqat mavjud Attendance yozuvlari, eng yangi birinchi). Qaytadi: xodim ma'lumoti + kunlar ro'yxati + jami statistikasi (`getStats` mantig'iga o'xshash: present/absent/late/leftEarly/dayOff/totalPenalty).

> Eslatma: yozuv bo'lmagan kunlarda smena `day_off` ekanini aniqlash uchun har kun `getShiftWindow` chaqirish qimmat. Drill-down faqat **mavjud Attendance yozuvlarini** ko'rsatadi (kelgan/kelmagan/kech kunlar). Bu yetarli — sodda va aniq.

### 3.2. Backend — yangi endpointlar

**Fayl:** `backend/api/routes/ceo.ts` (mavjud `ceoRouter`, `requireCeo` allaqachon qo'llangan).

#### `GET /api/ceo/attendance?date=YYYY-MM-DD`
- `date` ixtiyoriy; berilmasa bugun. Zod bilan validatsiya (noto'g'ri format → 400).
- `await connectDatabase()` → `attendancesService.getDailyRoster(date)`.
- Javob: `{ ok: true, ...roster }` (sana, summary, rows).
- Serializatsiya: `Date` maydonlar ISO string (`checkIn?.toISOString() ?? null`).

#### `GET /api/ceo/attendance/:userId?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `getObjectIdParam` bilan `userId` validatsiyasi.
- `from`/`to` ixtiyoriy; default oxirgi 30 kun (`addDays(startOfTashkentDay(), -29)` … bugun).
- `attendancesService.getEmployeeHistory(...)` → `{ ok: true, employee, days, totals }`.

### 3.3. Frontend

**RTK Query servisi — yangi fayl:** `frontend/services/ceoAttendanceApi.ts`
- `baseApi.injectEndpoints` bilan (mavjud `tasksApi.ts` namunasiga qarang).
- `getCeoAttendanceDay` (query: `date?` → `/ceo/attendance?date=...`), `providesTags: ['Attendance']`.
- `getCeoEmployeeAttendance` (query: `{ userId, from?, to? }` → `/ceo/attendance/:userId?...`).
- TypeScript turlari backend javobiga aniq mos (yuqoridagi `RosterRow`/`DailyRoster`; `Date`lar bu yerda `string | null`).

**Sahifa — yangi fayl:** `frontend/app/(ceo)/ceo/attendance/page.tsx`
- Server Component, `dynamic = 'force-dynamic'`, `requireCeoSession`.
- Sarlavha "Xodimlar davomati" + tavsif; `AttendanceMonitor` client komponentini render qiladi. `(ceo)` padding uslubi.

**Komponent — yangi fayl:** `frontend/components/ceo/attendance-monitor.tsx` (`'use client'`)
- Sana tanlash (`<input type="date">` yoki mavjud date control; default bugun).
- 6 ta stat karta: **Keldi** (`present`), **Kelmadi** (`absent`), **Kech qoldi** (`late`), **Erta ketdi** (`leftEarly`), **Jarimada** (`fined`), **Dam olishda** (`onDayOff`). `totalPenalty`ni jarima kartasi ostida ko'rsatish mumkin.
- Xodimlar jadvali: Ism · Do'kon · Kelgan vaqt · Ketgan vaqt · Holat (rangli badge) · Jarima. Vaqtlar `Asia/Tashkent` formatida (mavjud `frontend/lib/format.ts` helperlari bo'lsa, ulardan foydalaning).
- Holat badge ranglari: present=yashil, late=sariq, left_early=sariq, absent=qizil, day_off=kulrang/ko'k, not_checked_in=kulrang.
- Qatorni bosish → drill-down dialog.
- `useGetCeoAttendanceDayQuery` ishlatadi. Loading/empty/error holatlari.

**Komponent — yangi fayl:** `frontend/components/ceo/employee-attendance-dialog.tsx` (`'use client'`)
- `useGetCeoEmployeeAttendanceQuery({ userId })` orqali tanlangan xodim tarixini ko'rsatadi (kunma-kun: sana, kelgan/ketgan vaqt, holat, jarima) + yuqorida jami statistika.
- Mavjud `@/components/ui/dialog` (shadcn) ishlatadi.

Mavjud `(ceo)` komponentlari uslubiga (kartalar, badge, jadval) ergashing — `frontend/components/ceo/` ichidagi mavjud fayllarni namuna sifating oling.

---

## 4. Testlar

**Fayl:** `backend/test/attendance.roster.test.ts` (yangi, vitest)
- `getDailyRoster` uchun: present/absent/late/day_off/fined sanog'i to'g'riligini tekshiradigan kamida bitta birlik testi (in-memory mongo yoki mavjud test setup namunasiga qarang — `backend/test/` ichidagi mavjud testlarga ergashing, masalan `reports.leaderboard.test.ts`).
- Agar mavjud test infratuzilmasi DB talab qilsa va sozlash murakkab bo'lsa — summary hisoblash mantig'ini sof funksiyaga ajratib, uni test qilish maqbul.

---

## 5. Verifikatsiya (majburiy)

- `npm run typecheck` — backend + frontend **toza**.
- `npx vitest run` (backend) — barcha testlar **o'tadi** (yangi test ham).
- `npm run lint` (frontend) — yangi xato yo'q.

---

## API kontrakt xulosasi (backend ↔ frontend kelishuvi)

```
GET /api/ceo/attendance?date=YYYY-MM-DD
→ { ok, date, summary:{totalEmployees,present,absent,late,leftEarly,fined,onDayOff,totalPenalty},
    rows:[{userId,name,storeName,division,shiftType,checkIn,checkOut,lateMinutes,
           earlyLeaveMinutes,status,penaltyAmount,isDayOff}] }
    // checkIn/checkOut: ISO string | null

GET /api/ceo/attendance/:userId?from=YYYY-MM-DD&to=YYYY-MM-DD
→ { ok, employee:{id,name,storeName,division},
    days:[{date,checkIn,checkOut,status,lateMinutes,earlyLeaveMinutes,penaltyAmount,shiftType,isDayOff}],
    totals:{present,absent,late,leftEarly,dayOff,totalPenalty} }
```

`status` qiymatlari: `present | late | left_early | absent | day_off | not_checked_in`.

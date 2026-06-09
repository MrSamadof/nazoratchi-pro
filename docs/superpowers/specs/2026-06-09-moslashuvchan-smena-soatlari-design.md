# Dizayn: Moslashuvchan smena soatlari + menejer xodim qo'shishi

**Sana:** 2026-06-09
**Holat:** Tasdiq kutilmoqda

## 1. Maqsad

Hozir 3 ta smena (`morning` 08:00–18:00, `evening` 13:00–23:00, `flexible`)
soatlari kodda (`constants.ts`) qotirib yozilgan va faqat CEO xodim qo'sha oladi.

Kerakli o'zgarishlar:

1. **Smena soatlarini tahrirlash** — 3 ta smenaning nomi va soatlari bazada
   saqlanib, CEO va menejer tomonidan o'zgartiriladigan bo'lsin.
2. **Qo'lda soat kiritish** — yangi xodim olganda: 3 ta smenadan birini tanlash
   **yoki** o'sha xodim uchun ish vaqtini (boshlanish/tugash) qo'lda yozish.
3. **Menejer xodim qo'sha olsin** — hozir faqat CEO. Menejer **faqat `employee`**
   rolidagi xodim qo'sha/tahrirlay oladi.

## 2. Asosiy qarorlar (tasdiqlangan)

- 3 ta smena saqlanadi, faqat soatlari tahrirlanadigan bo'ladi.
- Smena shablon soatlari **`AppSettings`** bazasida saqlanadi; `constants.SHIFTS`
  dastlabki qiymat (fallback) bo'lib qoladi.
- **Shablon jonli o'qiladi:** xodim `morning` ga biriktirilgan bo'lsa va keyin
  shablon soati o'zgartirilsa — o'sha xodimning ish vaqti ham avtomatik yangilanadi.
  Faqat `custom` xodimning soati o'ziga yozib qo'yilgan vaqt bo'ladi.
- Smena shablonlarini **CEO va menejer** ikkisi ham tahrirlaydi.
- Menejer xodim qo'shganda **faqat `employee`** roli; CEO — hamma rol.

## 3. Ma'lumotlar modeli o'zgarishlari

### 3.1 Yangi smena turi: `custom`

`backend/src/core/config/constants.ts`:

- `SHIFT_TYPES = ['morning', 'evening', 'flexible', 'day_off', 'custom']`
- `FIXED_SHIFTS = ['morning', 'evening', 'custom']` — `custom` da ham belgilangan
  soat bor, demak kech kelish/erta ketish hisoblanadi.
- `SHIFTS` jadvali (`morning`/`evening`/`flexible`/`day_off`) o'zgarmaydi —
  dastlabki qiymat (seed/fallback) bo'lib qoladi. `custom` bu jadvalda yo'q.

### 3.2 AppSettings — smena shablonlari

`backend/src/modules/app-settings/app-settings.model.ts` ga yangi maydon:

```ts
shifts: {
  morning:  { label: String, startTime: String, endTime: String },
  evening:  { label: String, startTime: String, endTime: String },
  flexible: { label: String, startTime: String|null, endTime: String|null },
}
// default: null (o'qishda constants.SHIFTS bilan to'ldiriladi)
```

`day_off` va `custom` bu yerda yo'q — `day_off` doim soatsiz, `custom` esa
xodimga biriktiriladi.

### 3.3 User — qo'lda soat

`backend/src/modules/users/users.model.ts`:

- `defaultShiftType` enum'i `'custom'` ni ham qabul qiladi (avtomatik, chunki
  `SHIFT_TYPES` ishlatilgan).
- Yangi maydonlar:
  - `defaultShiftStartTime: { type: String, default: null }` — "HH:mm"
  - `defaultShiftEndTime:   { type: String, default: null }`

  Faqat `defaultShiftType === 'custom'` bo'lganda to'ldiriladi.

### 3.4 Schedule

Schedule modeli **o'zgarmaydi** — unda allaqachon `startTime`/`endTime`
override maydonlari bor. Enum `custom` ni avtomatik qabul qiladi.

## 4. Backend mantiq o'zgarishlari

### 4.1 AppSettings service — shablonni o'qish/yozish

`backend/src/modules/app-settings/app-settings.service.ts` (yoki mavjud service):

- `getShiftsConfig()` → DB dagi `shifts` ni qaytaradi, bo'sh bo'lsa
  `constants.SHIFTS` dan to'ldiradi. Qisqa muddatli kesh (masalan 30–60s) yoki
  har chaqiruvda o'qish (oddiy, kam yuk).
- `updateShiftsConfig(patch, updatedBy)` → validatsiya (HH:mm format) bilan yozadi,
  `auditLogsService.log()` chaqiradi.

### 4.2 schedules.service.ts — soatni bazadan o'qish

`resolveTimes()` va `buildWindow()` endi smena soatini `constants.SHIFTS` dan
emas, `getShiftsConfig()` dan oladi:

- `getShiftWindow()` boshida bir marta `getShiftsConfig()` chaqiriladi va
  pastdagi yordamchilarga uzatiladi (yoki yordamchilar config qabul qiladi).
- `buildWindow(shiftType, hasSchedule, startTime?, endTime?, config)`:
  - `day_off` → soatlar `null`.
  - `custom` → soatlar `startTime`/`endTime` argumentlaridan (xodimning yozgan
    vaqti yoki kunlik jadval override'i). `fixed = true`.
  - `morning`/`evening`/`flexible` → `config[shiftType]` dan, argument override
    bo'lsa u ustun.
- `getShiftWindow()` 2-bosqichida (xodim default smenasi) `User.findById` endi
  `defaultShiftStartTime` va `defaultShiftEndTime` ni ham `select` qiladi va
  `custom` bo'lsa ularni `buildWindow` ga uzatadi.

`setShift()` ham `getShiftsConfig()` ishlatadi (override bo'sh bo'lsa shablondan).

### 4.3 Xodim yaratish/tahrirlash mantiqi

`backend/src/modules/users/users.service.ts` (`create`/`update`):

- `defaultShiftType === 'custom'` bo'lsa → `defaultShiftStartTime`/`EndTime`
  saqlanadi (HH:mm validatsiya). Boshqa turlarda bu ikki maydon `null` ga tushadi.
- Validatsiya: `custom` tanlansa, ikkala soat ham majburiy va `start < end`.

`backend/src/modules/users/users.dto.ts`:

- `defaultShiftStartTime`, `defaultShiftEndTime` — `z.string().regex(HH:mm).nullable().optional()`.
- Zod `superRefine`: `defaultShiftType === 'custom'` → ikkala soat majburiy.

## 5. Ruxsatlar (permissions) o'zgarishi

### 5.1 Menejer xodim qo'shishi

Hozir: `POST /api/ceo/users`, `PATCH /api/ceo/users/:id` → `requireCeo`.

Yangi: `backend/api/routes/admin.ts` (`requireManager`) ga qo'shiladi:

- `POST   /api/admin/users`
- `PATCH  /api/admin/users/:id`
- `DELETE /api/admin/users/:id` (ixtiyoriy — kerak bo'lsa)

Server tomonida qat'iy cheklov (menejer uchun):

- `role` faqat `'employee'` bo'la oladi. Boshqa rol → 403.
- Mavjud `manager`/`ceo` xodimni tahrirlay/o'chira olmaydi → 403.
- CEO ham bu endpoint'dan foydalanishi mumkin (chunki `requireManager` CEO ni
  o'tkazadi), lekin CEO to'liq huquq uchun eski `/ceo/users` dan foydalanaveradi.

`usersService.create`/`update` o'zgarmaydi — cheklov route darajasida qo'yiladi
(`req.auth.user.role` ga qarab). Har bir amal `auditLogsService.log()` ga yoziladi.

### 5.2 Smena shablonini tahrirlash

- `GET  /api/admin/shifts-config` — `requireManager`
- `PUT  /api/admin/shifts-config` — `requireManager`

CEO va menejer ikkisi ham o'qiy/yoza oladi.

## 6. Frontend o'zgarishlari

### 6.1 Xodim formasi (`frontend/components/ceo/users-manager.tsx`)

- "Smena" dropdown'iga **"Qo'lda (custom)"** varianti qo'shiladi.
- `custom` tanlanganda 2 ta vaqt input ko'rinadi: **Boshlanish** va **Tugash**
  (HH:mm). Boshqa turlarda yashiringan.
- `usersApi` mutatsiyalari `defaultShiftStartTime`/`EndTime` ni yuboradi.
- Endpoint roli bo'yicha tanlanadi: CEO → `/ceo/users`, menejer → `/admin/users`
  (yoki komponent prop orqali `basePath` oladi).

### 6.2 Menejer uchun "Yangi xodim" (`frontend/app/(dashboard)/admin/employees/page.tsx`)

- Hozir faqat ko'rish. Unga `UsersManager` (yoki uning soddalashtirilgan,
  `employee`-only varianti) qo'shiladi.
- Rol tanlash menejer uchun yashirin/qulflangan (`employee`).

### 6.3 Smena shablonlari sozlamasi

- CEO sozlamalari (`frontend/app/(ceo)/ceo/settings/...`) va menejer paneliga
  "Smenalar" bo'limi: 3 smena nomi va soatini tahrirlovchi forma.
- Yangi `frontend/services/` endpoint: `getShiftsConfig` / `updateShiftsConfig`.

### 6.4 Turlar (`frontend/shared/types.ts`)

- `ShiftType` ga `'custom'` qo'shiladi.
- `SHIFT_META` ga `custom` yoziladi (label "Qo'lda", soatsiz).
- UI smena soatini ko'rsatganda iloji boricha backend'dan kelgan qiymatni
  ishlatadi (statik `SHIFT_META` soatlari faqat fallback).

## 7. Migratsiya / eski ma'lumotlar

- **Buzilmaydi.** Hozirgi xodimlarning `defaultShiftType` qiymatlari o'sha-o'sha
  ishlaydi. Yangi `defaultShiftStartTime`/`EndTime` default `null`.
- `AppSettings.shifts` bo'sh bo'lsa — kod `constants.SHIFTS` dan o'qiydi, ya'ni
  birinchi tahrir qilinmaguncha soatlar avvalgidek qoladi.
- Seed (`seed`/`seed:demo`) o'zgartirilishi shart emas; ixtiyoriy ravishda
  `AppSettings.shifts` ni dastlabki qiymat bilan to'ldirish mumkin.

## 8. Ta'sir qilmaydigan qismlar

Quyidagilar `getShiftWindow()` orqali soat oladi — ichki mantiqi o'zgarmaydi:

- Attendance check-in/check-out (kech kelish/erta ketish) — `custom` da ham
  `fixed: true` bo'lgani uchun avtomatik hisoblaydi.
- `mark-absentees`, `morning-reminder` joblari (faqat `isDayOff` ni tekshiradi).
- `penalties` (daqiqaga asoslangan), Billz, sotuvlar, AI tahlil, hisobotlar.

## 9. Testlar

- `schedules.service` — `getShiftWindow` uchun: `custom` xodim, shablon o'zgarganda
  `morning` xodim soati yangilanishi, `day_off`/`flexible` soatsizligi.
- `users.service`/dto — `custom` da soat majburiyligi va `start < end` validatsiyasi.
- Ruxsat testi: menejer `manager`/`ceo` yarata/tahrirlay olmasligi.

## 10. Ochiq (kelajak) ishlar — bu spec doirasidan tashqarida

- Kunlik smena jadvali board'iga (`schedule-board.tsx`) `custom`/soat override
  qo'shish — hozircha shablon turlari bilan ishlayveradi (model qo'llab-quvvatlaydi,
  UI keyin).

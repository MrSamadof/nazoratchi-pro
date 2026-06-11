# REJA.md — Ish holati

> Yangi sessiyada: shu faylni o'qib, **faol vazifa**dan davom et.

---

## ✅ Bajarilgan — CEO sidebar: Topshiriqlar + Xodimlar davomati (2026-06-11)

CEO sidebaridan **"Operatsion panel"** (`/dashboard`) olib tashlandi; o'rniga ikkita bo'lim qo'shildi: **Topshiriqlar** (`/ceo/tasks`) va **Xodimlar davomati** (`/ceo/attendance`). Orkestratsiya: Fable 5 (orkestor) + 2 ta Opus 4.8 subagent (backend/frontend parallel).

**Natija:**
- **Sidebar:** `ceo-sidebar.tsx` + `ceo-mobile-nav.tsx` — `Operatsion panel` olib tashlandi, `Topshiriqlar` (`ClipboardList`) va `Xodimlar davomati` (`CalendarCheck`) `Sozlamalar`dan oldin qo'shildi.
- **Topshiriqlar:** yangi `app/(ceo)/ceo/tasks/page.tsx` — mavjud `TasksBoard`ni CEO panelida qayta ishlatadi (yangi backend yo'q).
- **Davomat (backend):** `attendances.service.ts` — `getDailyRoster(date)` (barcha xodim kunlik holati + summary: present/absent/late/leftEarly/fined/onDayOff/totalPenalty) va `getEmployeeHistory(userId, from, to)`. `ceo.ts` — `GET /api/ceo/attendance?date=` va `GET /api/ceo/attendance/:userId?from&to` (`requireCeo`). Yangi status: `day_off`/`not_checked_in` (hisoblanadi). Yangi test `attendance.roster.test.ts`.
- **Davomat (frontend):** `ceoAttendanceApi.ts` (RTK Query), `app/(ceo)/ceo/attendance/page.tsx`, `attendance-monitor.tsx` (sana tanlash + 6 stat karta + xodimlar jadvali), `employee-attendance-dialog.tsx` (xodimni bosib drill-down tarix). Dialog uchun mavjud `@/components/ui/modal` ishlatildi (`dialog` yo'q edi).

**Spec:** `docs/superpowers/specs/2026-06-11-ceo-tasks-attendance-design.md`.
**Tekshirildi:** `npm run typecheck` (backend+frontend) toza; `npx vitest run` 42/42 o'tdi; `npm run lint` toza.
Qoladi (qo'lda, ixtiyoriy): jonli muhitda (`seed:demo`) CEO bo'lib kirib davomat sahifasini ko'z bilan ko'rish.

---

## ✅ Bajarilgan — Savdo summasini olib tashlash (2026-06-09)

Xodim savdo formasidan "Summa" olib tashlandi; reyting dona bo'yicha; CEO/AI pul hisobotlari faqat Billz'dan, xodim savdosi hamma joyda dona. Tafsilot: CLAUDE.md "Sales & rating" bo'limi va xotira `task-remove-sale-amount`.

---

## ✅ Bajarilgan — Xodimlar aro reytingni bo'lim bo'yicha ajratish (2026-06-09)

Xodimlar aro reyting **Dubai House** va **Amir** bo'limlariga ajratildi — har biri o'z ichida dona bo'yicha mustaqil reyting. Do'konlar aro reyting tegmadi.

**Natija:**
- API: `employees[]` → `employeesByDivision[]` (doim ikkala bo'lim, `dubai_house` → `amir`; bo'sh bo'lsa `rows: []`).
- `null`/boshqa bo'lim xodimlar reytingdan chiqarib tashlanadi.
- `me.rank` endi **o'z bo'limi ichida**; `me.division` qo'shildi.
- Telegram (`formatDailyLeaderboardText`): har bo'lim sarlavhasi (`🏪 ... bo'limi:`) + bo'sh bo'lim uchun "— hali savdo yo'q" + oxirida rag'bat satri.
- UI: `LeaderboardFull` (ikkala sarlavha doim ko'rinadi), `LeaderboardCard` (faqat to'la bo'limlar), me banneri bo'lim yorlig'i bilan.

**O'zgargan fayllar:** `backend/src/modules/reports/reports.service.ts`, `backend/api/routes/reports.ts`, `backend/test/reports.leaderboard.test.ts`, `frontend/components/leaderboard.tsx`, `frontend/app/(dashboard)/reyting/page.tsx`, `frontend/app/(dashboard)/dashboard/page.tsx`.

**Hujjatlar:** spec `docs/superpowers/specs/2026-06-09-leaderboard-by-division-design.md`, reja `docs/superpowers/plans/2026-06-09-leaderboard-by-division.md`.

**Tekshirildi:** `npm run typecheck` (backend + frontend) toza; `npx vitest run` 24/24 o'tdi.
Qoladi (qo'lda, ixtiyoriy): `npm run job daily-report` ni xavfsiz muhitda (seed:demo) ishga tushirib Telegram matnini ko'z bilan ko'rish — jonli job menejer/CEO'ga real xabar yuborgani uchun bu yerda ishga tushirilmadi.

---

## ✅ Bajarilgan — Billz jonli ulanish + sozlash (2026-06-09)

Billz POS real ulandi va sinovdan o'tdi (kompaniya "Amir").

**Natija:**
- Ishlaydigan `secret_token` topildi (eski n8n workflow'idan, `a484219f…`) — eski token (`db534ed4…`) savdoga ruxsatga ega emas edi (403). Token `.env` (`BILLZ_API_TOKEN`) **va** AppSettings'ga (shifrlangan) yozildi. App tokenni AppSettings'dan o'qiydi.
- 5 do'konga real Billz UUID biriktirildi; demo'dagi "Dubai House Afsona" → **"Dubai House Namangan"** (slug `dubai-afsona` saqlandi), UUID `5ea52cb1…`.
- `billz-sync` job ishladi — bugungi real savdo tortildi (jami ~84.9 mln so'm, 5 do'kon).

**⚠️ Qoladi:** repo public va token chatda ko'rindi — Billz'da tokenni **rotate** qilib, AppSettings + `.env`'ni yangilash kerak.

---

## ✅ Bajarilgan — daily-report savdo bug'i (2026-06-09)

`reports.service.ts` `formatDailySalesText` — `getCachedDailySales` `populate('storeId')` qiladi, lekin kod `b.storeId.toString()`ni (butun hujjat) `store._id`ga solishtirib, savdoni DOIM 0 ko'rsatardi. Endi `b.storeId._id`ga solishtiriladi.

**O'zgargan fayl:** `backend/src/modules/reports/reports.service.ts` (527-qator).
**Tekshirildi:** `npx tsc --noEmit` toza; daily-report endi real savdoni ko'rsatadi. Weekly/monthly (`buildSalesReport`, aggregation yo'li) bug'siz — to'g'ri ishlaydi.

---

## ✅ Bajarilgan — Demo ma'lumotlarni tozalash + GitHub push (2026-06-09)

- Barcha demo ma'lumot MongoDB'dan o'chirildi — faqat real qoldi: CEO useri, 5 do'kon (Billz UUID bilan), `billzsales`, `penaltyrules`/`companyrules`, `appsettings`. O'chirildi: 17 demo user, davomat (157), jadval (105), rag'bat (34), vazifa, bildirishnoma, audit-log, sessiya + bo'sh eski kolleksiyalar.
- Git init + push: **https://github.com/MrSamadof/nazoratchi-pro** (Public, `main`). Sirlar (`.env`) gitignore bilan himoyalandi; eski `git-setup.sh`/`git-debug.sh` gitignore'ga qo'shildi.

---

## ✅ Bajarilgan — Menejer barcha xodimni tahrirlay olishi (2026-06-11)

Muammo: menejer do'konga biriktirilgan (`storeId` bor) bo'lgani uchun faqat o'z do'konidagi xodimlarni ko'rar/tahrirlar edi; eski yoki `storeId=null` xodimlar ro'yxatda chiqmas va `403` ("Bu xodim sizning do'koningizdan emas") berardi.

**Yechim (`backend/api/routes/admin.ts`, 3 nuqta):**
- `GET /admin/users` — ro'yxat filtridan `if (scope) filter.storeId = scope` olib tashlandi → menejer barcha do'kondagi `employee`'larni ko'radi.
- `loadManagedEmployee` — do'kon scope `403` tekshiruvi olib tashlandi (rol tekshiruvi qoldi: faqat `employee`).
- `PATCH /admin/users/:id` — `if (scope) delete dto.storeId` olib tashlandi → menejer xodimning do'konini ham o'zgartira/biriktira oladi (forma allaqachon do'kon selektoriga ega).

**O'zgarmadi:** menejer hamon `manager`/`ceo` userlarni boshqara olmaydi va rol o'zgartira olmaydi (`/role` — faqat CEO). Boshqa admin ko'rinishlari (overview, approvals, off-site, reports) do'kon scope'ida qoladi. `POST /admin/users` create — yangi xodim hamon menejer do'koniga tushadi (default; keyin tahrirlanadi).

**Tekshirildi:** `npx tsc --noEmit` toza; `npx vitest run` 41/41 o'tdi. Real bazada: 1 CEO + 1 menejer (Samatov Odilbek, do'konga biriktirilgan), 0 employee — muammo ildizi tasdiqlangan.

---

## ✅ Bajarilgan — Bajarilgan topshiriqni o'chirish (2026-06-11)

Bajarilgan (`done`) topshiriqlar doskada qolib ketardi va o'chirish imkoni yo'q edi. Endi CEO/menejer bajarilgan topshiriqni o'chira oladi.

**Natija:**
- Backend: `DELETE /api/tasks/:id` (`requireManager`). `tasksService.remove()` — faqat `status==='done'` topshiriqni o'chiradi (aks holda `NOT_DONE` → 400). Audit log: `admin.config_changed` (`meta.op='delete_task'`).
- Frontend: `deleteTask` RTK Query mutatsiyasi (optimistik — karta darhol yo'qoladi), `TaskCard`'da bajarilgan kartaga "O'chirish" tugmasi (faqat manager/CEO) + tasdiq modali.

**Himoya:** faqat `done` o'chiriladi (faol topshiriq tasodifan yo'qolmaydi); o'chirish faqat manager/CEO.

**O'zgargan fayllar:** `backend/src/modules/tasks/tasks.service.ts`, `backend/api/routes/tasks.ts`, `frontend/services/tasksApi.ts`, `frontend/features/tasks/components/task-card.tsx`.

**Tekshirildi:** backend+frontend `tsc --noEmit` toza; `npx vitest run` 41/41 o'tdi.

---

## 🔜 FAOL VAZIFA — yo'q

Hozircha faol vazifa yo'q. Yangi vazifa qo'shilganda shu yerga yoziladi.

> Ixtiyoriy keyingi qadamlar: (1) Billz tokenni rotate qilish; (2) o'tgan kunlarni backfill qilib haftalik/oylik hisobotni real tarix bilan to'ldirish.

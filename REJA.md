# REJA.md — Ish holati

> Yangi sessiyada: shu faylni o'qib, **faol vazifa**dan davom et.

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

## 🔜 FAOL VAZIFA — yo'q

Hozircha faol vazifa yo'q. Yangi vazifa qo'shilganda shu yerga yoziladi.

> Ixtiyoriy keyingi qadamlar: (1) Billz tokenni rotate qilish; (2) o'tgan kunlarni backfill qilib haftalik/oylik hisobotni real tarix bilan to'ldirish.

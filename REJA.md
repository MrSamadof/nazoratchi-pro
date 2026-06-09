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

## 🔜 FAOL VAZIFA — yo'q

Hozircha faol vazifa yo'q. Yangi vazifa qo'shilganda shu yerga yoziladi.

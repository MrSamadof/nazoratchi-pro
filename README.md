# Nazoratchi Pro

"Amir" kompaniyasi uchun davomat va savdo nazorati **web ilovasi**.

`v1` (n8n) → `v2` (Telegram bot) → **`v3` (Next.js web)** ga migratsiya.

## Stack

- **Frontend + API:** Next.js 15 (App Router) + React 19 + Tailwind v4 + shadcn/ui
- **DB:** MongoDB + Mongoose
- **Auth:** Telefon + 4-6 raqamli PIN (bcrypt) + httpOnly cookie sessiya
- **Worker:** alohida Node jarayoni (`node-cron` bilan kunlik/haftalik/oylik hisobotlar, Billz sinx, ertalabki eslatma)
- **Bildirishnoma:** Telegram outgoing API (`grammy` `Api` class) — polling/webhook yo'q
- **AI:** Google Gemini (ixtiyoriy — hisobot tahlili)
- **POS:** Billz API (5 do'kon — har soatda sinx)
- **Deploy:** Docker + docker-compose (web + worker + mongo)

## Tuzilma

```
/
├── app/                            # Next.js App Router
│   ├── (auth)/{login,register}/    # Telefon+PIN forma, 4-qadamli registratsiya
│   ├── (dashboard)/                # Auth bilan himoyalangan sahifalar
│   │   ├── dashboard/              # Bosh sahifa
│   │   ├── attendance/             # Keldim / Ketdim + 7 kunlik
│   │   ├── sales/                  # Billz cache + savdo kiritish
│   │   ├── approvals/              # Ruxsat so'rovi + tarix
│   │   ├── rules/                  # Kompaniya qoidalari
│   │   └── admin/                  # Admin panel (faqat admin/superadmin)
│   │       ├── pending/            # Tasdiq kutayotgan xodimlar va so'rovlar
│   │       ├── employees/          # Xodimlar ro'yxati
│   │       ├── reports/            # Kunlik / haftalik / oylik + AI tahlil
│   │       └── audit-logs/         # Barcha amallar tarixi
│   └── api/                        # REST API
├── components/                     # UI komponentlar (shadcn primitives + custom)
│   ├── ui/                         # button, input, card, select, tabs, accordion, ...
│   ├── admin/                      # admin-only komponentlar
│   └── *.tsx                       # pin-pad, sale-form, approval-form, ...
├── lib/utils.ts                    # cn helper
├── middleware.ts                   # Auth guard
├── src/                            # Server-only biznes mantiq
│   ├── auth/                       # session helpers, admin guard
│   ├── core/                       # config, database, logger, utils
│   ├── modules/                    # auth, users, attendances, sales, approvals,
│   │                               # billz, ai, reports, penalties, audit-logs,
│   │                               # company-rules, stores, sheets
│   ├── jobs/                       # cron joblar
│   ├── notifications/              # Telegram outgoing
│   └── scripts/                    # seed, backup, run-job
├── worker/main.ts                  # Worker entry point
├── public/
├── docker-compose.yml              # Dev (mongo + mongo-express)
├── docker-compose.prod.yml         # Prod (web + worker + mongo)
└── Dockerfile                      # Web va worker uchun bitta image
```

## Birinchi ishga tushirish

### 1. Dependency'larni o'rnatish

```bash
npm install
```

### 2. `.env` tayyorlash

```bash
cp .env.example .env
```

`.env` ni to'ldiring:

- `MONGO_URI` — MongoDB ulanish (default Docker ishlatsa, o'zgartirmang)
- `SESSION_SECRET` — uzun random satr (kamida 32 belgi) — sessiya cookie ni imzolash uchun
- `SUPERADMIN_PHONE` — birinchi admin telefon raqami (faqat raqamlar, masalan `998901234567`)
- `SUPERADMIN_PASSWORD` — 4-6 raqamli PIN
- `BOT_TOKEN` — **ixtiyoriy**, faqat outgoing Telegram bildirishnoma uchun. Bo'sh qoldirilsa Telegram xabarlar yuborilmaydi.
- `GEMINI_API_KEY` — ixtiyoriy (AI tahlil uchun)
- `BILLZ_*` — ixtiyoriy (Billz POS integratsiyasi)

### 3. MongoDB ni ko'tarish (Docker Desktop kerak)

```bash
npm run db:up
```

Web UI: http://localhost:8081 (admin/admin)

### 4. Boshlang'ich ma'lumotlarni yuklash (do'konlar, jarima qoidalari, superadmin)

```bash
npm run seed
```

### 5. Web ilovani ishga tushirish

```bash
# Dev rejimi (auto-reload)
npm run dev

# Production build
npm run build
npm start
```

Endi brauzerda `http://localhost:3000/login` ga o'ting va telefon + PIN bilan kiring.

### 6. (Ixtiyoriy) Worker — cron joblar

Kunlik/haftalik/oylik hisobotlar va ertalabki eslatma Telegram orqali yuborilishi uchun:

```bash
npm run worker:dev     # dev rejimi (auto-reload)
# yoki
npm run worker         # bir martalik ishga tushirish
```

## Foydalanish

### Xodim uchun

1. `/register` — ro'yxatdan o'tish (ism → telefon → do'kon → PIN, 4 qadam)
2. Admin tasdiqlashini kutish
3. `/login` — telefon + PIN
4. Dashboard:
   - **Davomat** — Keldim / Ketdim + 7 kunlik statistika
   - **Savdo** — bugungi Billz cache + qo'lda kiritish
   - **Ruxsatlar** — kech kelish / erta ketishga so'rov
   - **Qoidalar** — kompaniya qoidalari

### Admin uchun

Yuqoridagi + `/admin`:
- **Bosh sahifa** — bugungi xulosa
- **Kutilayotgan** — yangi xodimlarni tasdiqlash + ruxsat so'rovlariga javob
- **Xodimlar** — ro'yxat
- **Hisobotlar** — kunlik / haftalik / oylik + AI tahlil
- **Audit log** — barcha amallar

## Avtomatik hisobotlar (worker cron)

| Jadval | Vaqt (Tashkent) | Nima qiladi |
|--------|-----------------|-------------|
| Billz sinx | Har soatda | Billz API dan bugungi savdoni cache ga yozadi |
| Ertalabki eslatma | Har kun 09:05 | Hali "Keldim" qilmaganlarga Telegram orqali eslatma |
| Kunlik hisobot | Har kun 21:00 | Davomat + savdo + AI tahlil → adminlarga Telegram |
| Haftalik hisobot | Yakshanba 21:00 | Hafta xulosa → adminlarga |
| Oylik hisobot | Har oy 1-kuni 09:00 | Oy xulosa → adminlarga |

Bitta jobni qo'lda ishga tushirish (debug):

```bash
npm run job daily-report
npm run job morning-reminder
npm run job billz-sync
npm run job weekly-report
npm run job monthly-report
```

## Production deploy (VPS / Docker)

```bash
# 1. Repo'ni klonlash
git clone <repo>
cd nazoratchi-pro

# 2. .env ni tayyorlash
cp .env.example .env
nano .env   # to'ldiring (SESSION_SECRET, SUPERADMIN_*, BOT_TOKEN, ...)

# 3. Docker compose bilan ishga tushirish (web + worker + mongo)
docker compose -f docker-compose.prod.yml up -d --build

# 4. Loglarni ko'rish
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f worker

# 5. Seed (birinchi marta)
docker compose -f docker-compose.prod.yml exec web npm run seed
```

Web ilova `http://<server>:3000` da bo'ladi. Reverse proxy (nginx / caddy) bilan HTTPS o'rnating.

## Backup

```bash
# Qo'lda
npm run backup

# Cron orqali (crontab -e):
0 2 * * * cd /path/to/nazoratchi && npm run backup
```

Backup `backups/<timestamp>/` papkasiga yoziladi.

## Skriptlar

| Skript | Maqsad |
|--------|--------|
| `npm run dev` | Next.js dev (auto-reload) |
| `npm run build` | Production build |
| `npm start` | Production ishga tushirish |
| `npm run worker` | Worker (cron + Telegram notif) |
| `npm run worker:dev` | Worker dev (auto-reload) |
| `npm run job <name>` | Bitta jobni qo'lda ishga tushirish |
| `npm run seed` | DB ga boshlang'ich ma'lumot |
| `npm run backup` | mongodump bilan zaxira |
| `npm run typecheck` | TypeScript tekshirish |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run db:up` | MongoDB konteyner (+ mongo-express) |
| `npm run db:down` | MongoDB to'xtatish |

## Eski loyihalar

- `v2` Telegram bot — ushbu repo'ning git tarixida (commit `6b672e1` va undan oldin)
- `v1` n8n — alohida hujjat: [`nazoratchi_ai_pro_docs.md`](./nazoratchi_ai_pro_docs.md)

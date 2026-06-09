# Nazoratchi Pro — Foydalanuvchi qo'llanmasi

> Tizim ikki qismdan iborat: **Web ilova** (asosiy ish joyi) va **Telegram bot** (eslatma va hisobotlar uchun). Bot mustaqil "chat-bot" emas — u faqat akkauntni bog'lash va xabar yuborish uchun ishlaydi.

- **Web ilova:** http://45.88.188.24:3000
- **Telegram bot:** [@nazoratchi_pro_bot](https://t.me/nazoratchi_pro_bot)

---

## 1. Tizimga kirish

1. Brauzerda http://45.88.188.24:3000 ni oching.
2. **Telefon raqami** va **PIN kod** (4–6 raqam) bilan kiring.
3. Yangi xodimlar **Ro'yxatdan o'tish** orqali ariza qoldiradi — rahbar tasdiqlamaguncha kira olmaydi.

> Rahbar (CEO) hisobi: telefon `998901234567`, PIN `1234`. **Birinchi imkonda PIN'ni o'zgartiring.**

---

## 2. Telegram botni qanday ishlatadi

Bot **ikki vazifani** bajaradi, boshqa hech narsa qilmaydi:

1. **Akkauntni bog'lash** (`/start` orqali) — kim qaysi Telegram'ga ega ekanini biladi.
2. **Xabar yuborish** — eslatma, hisobot, tasdiq/rad xabarlari shu yerga keladi.

Botga oddiy matn yozsangiz javob bermaydi — u buyruq qabul qiluvchi bot emas. Barcha amallar **web ilovada** bajariladi.

### Telegram'ni ulash (har bir xodim bir marta qiladi)

1. Web ilovaga kiring → chap menyudan **Profil** ga o'ting.
2. **"Telegram'ni ulash"** tugmasini bosing — bir martalik havola chiqadi.
3. Havolani bosing (yoki [@nazoratchi_pro_bot](https://t.me/nazoratchi_pro_bot) ni ochib **Start** bosing).
4. Bot **"✅ Tayyor!"** deb javob beradi — bog'landi. Sahifa o'zi yangilanadi.

> Havola **15 daqiqa** amal qiladi. Muddat tugasa, Profil'dan yangi havola oling.
> Ulanmaguncha Telegram xabarlari **kelmaydi** (lekin web ilova baribir ishlaydi).

---

## 3. Bot qanday xabarlar yuboradi

### Avtomatik (vaqt bo'yicha — Asia/Tashkent)

| Vaqt | Xabar | Kimga |
|------|-------|-------|
| Har kuni **09:05** | Hali ishga kelmaganlarga eslatma | Kelmagan xodimlar |
| Har kuni **21:00** | Kunlik hisobot (davomat + savdo + AI tahlil) | Rahbarlar (menejer/CEO) |
| Har kuni **23:40** | Kunlik rag'batlar (top do'kon, top xodim) | Rahbarlar |
| Har **yakshanba 21:00** | Haftalik savdo hisoboti | Rahbarlar |
| Har oy **1-kuni 09:00** | Oylik savdo hisoboti | Rahbarlar |

> Fonda yana ikkita ish bor: Billz savdolarini **har soatda** sinxronlash va **23:30 da** kelmaganlarni belgilash (bular xabar yubormaydi).

### Hodisaga qarab (darhol)

| Hodisa | Kimga boradi |
|--------|--------------|
| Yangi xodim ro'yxatdan o'tdi | CEO(lar)ga |
| Tasdiqlash arizasi yaratildi | CEO(lar)ga |
| Hisob tasdiqlandi / rad etildi | Tegishli xodimga |
| Rag'bat berildi | Xodimga (va rahbarlarga) |

---

## 4. Web ilova bo'limlari

| Bo'lim | Nima qilinadi |
|--------|---------------|
| **Dashboard** | Umumiy ko'rsatkichlar — davomat, savdo, holatlar |
| **Davomat (Attendance)** | Ishga kelish/ketishni qayd etish (check-in / check-out) |
| **Savdo (Sales)** | Savdolarni kiritish/ko'rish (Billz bilan sinxron) |
| **Tasdiqlash (Approvals)** | Tasdiq talab qiladigan amallarni ko'rib chiqish |
| **Rag'batlar (Rewards)** | Bonus/rag'bat berish va tarix |
| **Vazifalar (Tasks)** | Vazifa qo'yish va bajarilishini kuzatish |
| **Qoidalar (Rules)** | Jarima/qoida sozlamalari |
| **Profil** | Telegram'ni ulash, shaxsiy sozlamalar |
| **Admin** | (faqat rahbar) Xodimlarni tasdiqlash, do'kon, foydalanuvchilar |

### Rollar

- **employee (xodim)** — davomat, savdo, o'z profili.
- **manager (menejer)** — yuqoridagilar + hisobotlar, rag'bat, tasdiqlash.
- **ceo (rahbar)** — hammasi + xodimlarni tasdiqlash/o'chirish, admin sozlamalari.

---

## 5. Tez-tez uchraydigan savollar

**Telegram'ga xabar kelmayapti?**
- Profil'da Telegram **ulanganini** tekshiring. Ulanmagan bo'lsa — 2-bo'limdagi qadamlarni bajaring.
- Hisobotlar faqat **rahbarlarga** boradi; oddiy xodim faqat eslatma/tasdiq xabarlarini oladi.

**Ulash havolasi ishlamadi ("muddat tugagan")?**
- Havola 15 daqiqa amal qiladi — Profil'dan yangisini oling.

**"Bu Telegram boshqa foydalanuvchiga bog'langan" deyapti?**
- Bitta Telegram akkaunt faqat bitta xodimga bog'lanadi. Rahbarga murojaat qiling.

**Login qildim, lekin tizim chiqarib yubordi?**
- Bu HTTP (TLS yo'q) sayt — agar muammo bo'lsa rahbarga ayting (kelajakda HTTPS qo'yiladi).

---

## 6. Administrator uchun (texnik)

Server: `root@45.88.188.24`, kod `/opt/nazoratchi`, Docker Compose bilan ishlaydi.

```bash
# Holatni ko'rish
cd /opt/nazoratchi && docker compose -f docker-compose.prod.yml ps

# Loglar (masalan, worker = bot + cron)
docker compose -f docker-compose.prod.yml logs -f worker

# Qayta ishga tushirish
docker compose -f docker-compose.prod.yml restart

# .env o'zgartirgandan keyin
docker compose -f docker-compose.prod.yml up -d
```

> ⚠️ `npm run seed` **bazani tozalaydi** — faqat birinchi o'rnatishda ishlatiladi, ishlab turgan tizimda EMAS.

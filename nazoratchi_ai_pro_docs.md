# Nazoratchi AI Pro — To'liq Texnik Dokumentatsiya

> **Loyiha egasi:** Odilbek Samadof  
> **Platforma:** n8n (self-hosted)  
> **AI model:** Google Gemini (PaLM)  
> **Interfeys:** Telegram Bot  
> **Ma'lumotlar bazasi:** Google Sheets + Billz POS API  
> **Oxirgi yangilanish:** 12.05.2026  
> **Versiya:** 641 (eng oxirgi faol versiya)

---

## Mundarija

1. [Loyiha haqida umumiy ma'lumot](#1-loyiha-haqida-umumiy-malumot)
2. [Kompaniya strukturasi](#2-kompaniya-strukturasi)
3. [Texnik arxitektura](#3-texnik-arxitektura)
4. [Workflowlar ro'yxati](#4-workflowlar-royxati)
5. [Asosiy workflow: Nazoratchi Pro AI Agent](#5-asosiy-workflow-nazoratchi-pro-ai-agent)
6. [Sub-workflowlar (tool sifatida)](#6-sub-workflowlar-tool-sifatida)
7. [Avtomatik hisobot workflowlari](#7-avtomatik-hisobot-workflowlari)
8. [Google Sheets strukturasi](#8-google-sheets-strukturasi)
9. [Billz API integratsiyasi](#9-billz-api-integratsiyasi)
10. [Admin va foydalanuvchi rollari](#10-admin-va-foydalanuvchi-rollari)
11. [Callback tizimi (tasdiq tugmalari)](#11-callback-tizimi-tasdiq-tugmalari)
12. [Xato holatlari va cheklovlar](#12-xato-holatlari-va-cheklovlar)
13. [GitHub backup tizimi](#13-github-backup-tizimi)
14. [Arxivlangan va qo'shimcha workflowlar](#14-arxivlangan-va-qoshimcha-workflowlar)

---

## 1. Loyiha haqida umumiy ma'lumot

**Nazoratchi AI Pro** — "Amir" kompaniyasining savdo do'konlari va ofisini boshqarish uchun yaratilgan sun'iy intellekt asosidagi avtomatlashtirish tizimi.

### Tizim nima qiladi?

| Funksiya             | Tavsif                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Davomat nazorati** | Xodimlar Telegram orqali "keldim" / "ketdim" yozadi, tizim avtomatik qayd etadi                                 |
| **Tasdiq tizimi**    | Kech kelish yoki erta ketish uchun xodim so'rov yuboradi, admin inline button orqali tasdiqlaydi yoki rad etadi |
| **Savdo nazorati**   | Billz POS API orqali 5 do'kondan real-vaqt savdo ma'lumoti olinadi                                              |
| **Savdo kiritish**   | Xodimlar o'z guruhida sotilgan mahsulot sonini yozadi                                                           |
| **Jarima tizimi**    | Kechikish yoki buzilish bo'lsa jarima hisoblanadi, xodim "roziman" deb tasdiqlaydi                              |
| **Hisobotlar**       | Kunlik, haftalik, oylik davomat va savdo hisobotlari avtomatik Telegramga yuboriladi                            |
| **Qoidalar**         | Admin bot orqali kompaniya qoidalarini so'rash va olish imkoniga ega                                            |

### Asosiy texnologiyalar

- **n8n** — workflow avtomatlashtirish platformasi
- **Google Gemini (PaLM)** — AI agent uchun til modeli
- **Telegram Bot API** — asosiy foydalanuvchi interfeysi
- **Google Sheets** — barcha ma'lumotlar saqlanadigan joy
- **Billz POS API** — savdo kassasi integratsiyasi
- **GitHub** — workflowlar zaxirasi (backup)

---

## 2. Kompaniya strukturasi

### Do'konlar — Billz bilan (savdo nazorati mavjud)

| Do'kon nomi           | Billz UUID |
| --------------------- | ---------- |
| Amir Kids             |
| Amir Premium          |
| Dubai House           |
| Dubai House Abu Sahiy |
| Dubai House Afsona    |

### Do'konlar — Billz yo'q (faqat davomat nazorati)

| Bo'lim          |
| --------------- |
| Dubai Gold      |
| Amir Avto Savdo |
| Ofis            |

### Xodimlar ro'yxati bo'limlar bo'yicha

| Bo'lim                    | Xodimlar                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **Amir Kids**             | Lutibayev Odiljon, Tursunova Nodira                                                                 |
| **Amir Premium**          | Axmadov Murod, Boqijanov Olimxon                                                                    |
| **Dubai House**           | Muzaffarova Gulchehra, MuhammadMuso, Abdujabbarova Zahroxon, Abdulboqiyeva Omina                    |
| **Dubai House Abu Sahiy** | Boltikhanov Ulug'bek, Yo'ldasheva Sadoqat                                                           |
| **Dubai House Afsona**    | Abduhamidov Abduqayum, Mirzaboyeva Oydina, Omonova Nazira, Axmedova Mashxura, Sadriddinova Shaxzoda |
| **Dubai Gold**            | Mahmudjanov Ahmadxon, Raximjanov Nurillo                                                            |
| **Amir Avto Savdo**       | Tajibayev Xasanboy, Ziyoviddinov Salohiddin                                                         |
| **Ofis**                  | Abdumajidov Boburjon, Abdullayev Dovudxon, Samatov Odiljon                                          |

> ⚠️ **Muhim:** Tizimda bir xil ismli xodimlar bor (masalan, ikki "Odiljon"). AI DOIM familiyaga qarab farqlaydi: `Lutibayev Odiljon` ≠ `Samatov Odiljon`.

---

## 3. Texnik arxitektura

```
Telegram Bot (Trigger)
        │
        ▼
   Type Switch
   ┌─────┴─────┐
message      callback
   │              │
   ▼              ▼
Filter        Admin Check
   │              │
   ▼              ▼
Admin/User    Parse Callback
Switch            │
   │              ▼
   ▼        Update Sheets
AI Agent     (Tasdiqlar)
(Gemini)          │
   │              ▼
   ├──► Davomat - Router ──► Google Sheets
   ├──► Tasdiq - Router  ──► Telegram (Admin guruhiga)
   ├──► Qoidalar - Router ──► Google Sheets
   ├──► Billz API Savdo  ──► Billz API
   ├──► Hisobot - Davomat ──► Google Sheets
   └──► Savdo - Kiritish ──► Google Sheets
        │
        ▼
   Telegram (javob)
```

### Ma'lumot oqimi

```
Xodim yozadi → Filter (kalit so'z tekshirish) → AI Agent (intent aniqlash)
              → To'g'ri tool chaqiriladi → Sheets/API ga yoziladi
              → Natija xodimga yuboriladi
```

---

## 5. Asosiy workflow: Nazoratchi Pro AI Agent

**ID:** `5pD5qWvPdGwD9fRA`  
**Holat:** Faol  
**Versiya:** 641 ta o'zgarish

### Node'lar ro'yxati va vazifasi

| Node nomi                         | Turi                 | Vazifasi                                             |
| --------------------------------- | -------------------- | ---------------------------------------------------- |
| Nazoratchi Pro AI Agent           | `telegramTrigger`    | Bot trigger — xabar va callback qabul qiladi         |
| Type Switch                       | `switch`             | message vs callback_query ajratadi                   |
| Filter                            | `code` (JS)          | Kalit so'zlarni tekshiradi, bot o'zini bloklaydi     |
| Switch                            | `switch`             | Admin (ID: 53941445) yoki xodim ekanligini aniqlaydi |
| AI Agent (Admin)                  | `agent`              | Asosiy Gemini AI agenti                              |
| Google Gemini Chat Model          | `lmChatGoogleGemini` | LLM modeli                                           |
| Simple Memory                     | `memoryBufferWindow` | Har foydalanuvchi uchun 25 xabarlik xotira           |
| Send a text message               | `telegram`           | Javob yuboradi                                       |
| Admin Check                       | `code` (JS)          | Callback faqat adminlardan kelganini tekshiradi      |
| Parse Callback                    | `code` (JS)          | Callback data ni parse qiladi                        |
| Update Tasdiq Holati              | `googleSheets`       | Tasdiqlar sheetini yangilaydi                        |
| Edit a text message               | `telegram`           | Admin guruhidagi so'rov xabarini tahrirlaydi         |
| Answer Query a callback           | `telegram`           | Callback query ga popup javob beradi                 |
| Call 'Davomat - Router'           | `toolWorkflow`       | Davomat tool                                         |
| Call 'Tasdiq - Router'            | `toolWorkflow`       | Tasdiq tool                                          |
| Call 'Qoidalar - Router'          | `toolWorkflow`       | Qoidalar tool                                        |
| Call 'Billz API - Savdo Hisoboti' | `toolWorkflow`       | Savdo API tool                                       |
| Hisobot - Davomat Ma'lumot        | `toolWorkflow`       | Davomat hisoboti tool                                |
| Savdo - Kiritish                  | `toolWorkflow`       | Savdo kiritish tool                                  |
| Get row(s) in Google Sheets       | `googleSheetsTool`   | Hisobotlar sheeti o'qish                             |

---

### Filter Node — Kalit so'zlar mantigi

Filter node (JavaScript) quyidagi qoidalar bo'yicha ishlaydi:

**Bot xabarlari filtrlanadi:**

```javascript
// Bot o'zini bloklash
if (message.from.is_bot) return []
```

**Guruhda (group/supergroup):**

- Admin yozsa → bot jim turadi (admin guruhda bot bilan gaplashmaydi)
- Xodim + kalit so'z yozsa → o'tkaziladi

**Shaxsiy chatda (private):**

- Admin → har qanday xabar o'tkaziladi
- Xodim → faqat kalit so'z bo'lsa o'tkaziladi

**Kalit so'zlar ro'yxati:**

```
keldim, keldm, kldim, kelgandim
ketdim, ketdm, ketim, chiqdim, chqdim
chiqib ketdim, uyga ketdim, ketmoqdaman, tugatdik, tugatdim
roziman, rozi, jarimaga roziman
kechikaman, kechikib, kechroq
kech kelaman, kech kelish, kech keldim
ketaman, ketmoqchiman, ketishim kerak
ertaroq, erta ketaman, erta ketish
chiqib ketaman, chiqishim kerak
ruxsat, tasdiq, rozilik, iltimos
jarima, kechikish, qoida, qoidalar
tartib, necha pul, buzilsa, jarimasi, qancha
smenam, smena, dona sotdim
ta mahsulot, bugun sotdim
```

---

### AI Agent — System Prompt (asosiy qoidalar)

**Til:** Faqat O'zbek tili  
**Uslub:** Qisqa, aniq, professional, do'stona  
**Vaqt zonasi:** Asia/Tashkent (UTC+5)  
**Sana formati:** DD.MM.YYYY (masalan: 17.04.2026)  
**Vaqt formati:** HH:MM (masalan: 09:05)  
**Raqam formati:** 1 000 000 so'm

**Qoidalar:**

- Noaniq savol → aniqlashtir
- Ma'lumot yo'q → "Ma'lumot topilmadi"
- Xato → "Texnik xato, qayta urining"
- Soxta ma'lumot HECH QACHON berma

---

### Ism topish algoritmi (barcha toollar uchun umumiy)

AI agent xabardan xodim ismini topishda quyidagi tartibni qo'llaydi:

1. **Familiya ustuvor:** Avval familiyaga qarab qidiradi
   - `"Samatov Odiljon keldim"` → `Samatov Odiljon` (Ofis) — to'g'ri
   - Faqat ismga qarab qidirish — noto'g'ri

2. **Bir xil ismli xodimlar:** Familiya bilan farqlash
   - `Lutibayev Odiljon` (Amir Kids) ≠ `Samatov Odiljon` (Ofis)

3. **Qisqa ism yozilsa:** Ro'yxatdan to'liq ismini topadi
   - Bir nechta mos kelsa → `"Qaysi Odiljon? Lutibayev yoki Samatov?"` deb so'raydi

4. **Topilmasa:** `"Iltimos, to'liq ism va familiyangizni yozing."`

---

### AI Agent Tools — har bir tool parametrlari

#### Tool 1: Davomat - Router

```
Intent turlari:
  KELDIM      → "keldim", "men keldim", "ishga keldim", "yetib keldim"
  KETDIM      → "ketdim", "chiqdim", "ishdan ketdim", "smenam tugadi"
  JARIMA_ROZI → "roziman", "jarimaga roziman", "to'layman", "ok rozi"

Parametrlar:
  intent:       KELDIM | KETDIM | JARIMA_ROZI
  ism_matndan:  xodimning to'liq ismi (ism topish algoritmiga ko'ra)

Qoida: Sana, vaqt, jarima, smena — hammasi TOOL ichida hisoblanadi.
       Tool natijasini o'zgartirmay xodimga yetkaz.

Bir xabarda ikki amal: "keldim jarimasiga roziman"
  → 1. KELDIM intent bilan chaqir
  → 2. JARIMA_ROZI intent bilan chaqir
  → Ikkala javobni birlashtirib xodimga yuboradi
```

#### Tool 2: Tasdiq - Router

```
Intent turlari (aynan kichik harf, pastki chiziq bilan):
  kech_kelish  → "kech kelaman", "kechikaman", "kech qolaman", "kechroq kelaman"
  erta_ketish  → "erta ketaman", "oldin ketaman", "ertaroq ketaman"

Parametrlar:
  intent:       kech_kelish | erta_ketish
  ism_matndan:  xodimning to'liq ismi
  sana:         DD.MM.YYYY formatida
  vaqt:         HH:MM (aytilmasa bo'sh)
  sabab:        xodim aytgan sabab (aytilmasa bo'sh)
  chat_id:      $json.message.chat.id (manfiy raqam — guruh ID)

Misollar:
  "Ertaga soat 10 da kelaman" → intent: kech_kelish, sana: ertangi sana, vaqt: 10:00
  "Bugun 17:00 da erta ketaman" → intent: erta_ketish, sana: bugungi sana, vaqt: 17:00
```

#### Tool 3: Qoidalar - Router

```
Faqat adminlar chaqira oladi.
Admin IDlar: 1027895725, 8526467213, 53941445

Parametrlar:
  savol:    admin bergan savol matni
  user_id:  foydalanuvchi ID si

Xodim so'rasa → "Bu ma'lumot faqat adminlar uchun"
```

#### Tool 4: Billz API - Savdo Hisoboti

```
Parametrlar:
  start_date: yyyy-MM-dd (masalan: 2026-04-15)
  end_date:   yyyy-MM-dd (masalan: 2026-04-17)

Nisbiy so'zlar:
  "kecha"  → yesterday
  "bugun"  → today
  "hafta"  → so'nggi 7 kun

Javob formati:
  📊 SAVDO HISOBOTI — [sana yoki davr]
  ━━━━━━━━━━━━━━━━━━
  🏪 Dubai House Abu Sahiy — X.XX mln (N dona)
  🏪 Dubai House Afsona    — X.XX mln (N dona)
  🏪 Amir Kids             — X.XX mln (N dona)
  🏪 Amir Premium          — X.XX mln (N dona)
  🏪 Dubai House           — X.XX mln (N dona)
  ━━━━━━━━━━━━━━━━━━
  💰 Jami: X XXX XXX so'm
  🏆 Eng yaxshi: [do'kon nomi]

Format qoidalari:
  - 1 mln dan kam: "XXX K"
  - 0 bo'lsa: "0"
  - Markdown (* _ **) va bullet (- •) — YO'Q
  - Bir nechta kun: har kun alohida, oxirida JAMI va TOP
```

#### Tool 5: Hisobot - Davomat Ma'lumot

```
Parametrlar:
  sana: DD.MM.YYYY formatida

Sana aniqlash:
  "bugun" / "bugungi" → bugungi sana
  "kecha" / "kechagi" → kechagi sana
  Aniq sana → o'sha sana
```

#### Tool 6: Savdo - Kiritish

```
Faqat guruh xabarlarida ishlaydi.

Misollar: "bugun 15 ta sotdim", "Nodira 12 ta"

Parametrlar:
  ism:     xodimning to'liq ismi
  soni:    sotilgan mahsulot soni (raqam)
  sana:    bugungi sana DD.MM.YYYY
  chat_id: guruh chat ID si
```

---

### Google Sheets Tool (Hisobotlar o'qish)

```
Spreadsheet: "Nazoratchi AI agent"
ID: 1T2tf2Bpe6ykPafPNCtKtfNIUOyXwDuJejPKS6odwCts
Sheet: Hisobotlar (gid=0)
```

---

## 6. Sub-workflowlar (tool sifatida)

### 6.1 Davomat - Router

**ID:** `Uy8bvEWrFMd0Wn3N`  
**Trigger:** Another Workflow (AI Agent tomonidan chaqiriladi)

**Node zanjiri:**

```
Trigger → Get Xodimlar (Sheets) → Get Davomat (Sheets) → Get Tasdiqlar (Sheets)
        → Validator (JS) → Switch (KELDIM/KETDIM/JARIMA_ROZI/Xato)
        → Sheets - Keldim   (yozish)
        → Sheets - Ketdim   (yozish)
        → Sheets - Jarima Rozi (yangilash)
        → Response (Set node)
```

**Validator nima qiladi:**

- Xodim ro'yxatda bor-yo'qligini tekshiradi
- Ketishdan oldin kelgan-kelmagligini tekshiradi
- Bir kunda ikki marta kelishni tekshiradi
- Kechikish/erta ketish tasdiqlanganligini tekshiradi
- Jarima qoidalarini qo'llaydi
- Smena vaqtini hisoblaydi

**Sheets:**

- `Nazoratchi AI Agent` spreadsheet
- `Xodimlar` sheet — ro'yxat
- `Davomat` sheet — kunlik yozuvlar
- `Tasdiqlar` sheet — ruxsatlar

---

### 6.2 Tasdiq - Router

**ID:** `GOAPZhcBnh78mv54`  
**Trigger:** Another Workflow

**Node zanjiri:**

```
Trigger → Get Xodimlar (Sheets) → Validator (JS) → Switch (kech_kelish/erta_ketish)
        → Send Tasdiq Xabari (Telegram — adminga inline button bilan)
        → Append Tasdiq (Sheets — yozib qo'yadi)
```

**Validator nima qiladi:**

- Xodim ro'yxatda bor-yo'qligini tekshiradi
- Sana va vaqtni validatsiya qiladi

**Telegram xabar formati (adminga):**

```
📋 Tasdiq so'rovi
👤 [Ism Familiya]
📅 [DD.MM.YYYY]
⏰ Vaqt: [kech kelish / erta ketish]
🕐 [HH:MM] (agar berilgan bo'lsa)
📝 Sabab: [sabab]

[✅ Tasdiqlash] [❌ Rad etish]
```

**Inline button callback_data formati:**

```
tasdiq_ok_[Ism Familiya]_[DD.MM.YYYY]_[kech_kelish|erta_ketish]
tasdiq_no_[Ism Familiya]_[DD.MM.YYYY]_[kech_kelish|erta_ketish]
```

**Tasdiqlar Sheets kolonkalari:**

```
sana | ism | tur | vaqt | holat | admin | javob_vaqti | xabar_id | izoh
```

---

### 6.3 Qoidalar - Router

**ID:** `Hsj8tY8w6XndhYyy`  
**Node soni:** 3  
**Trigger:** Another Workflow (faqat admin chaqira oladi)

Kompaniya qoidalari, jarima miqdorlari, tartib-qoidalar Sheets dan o'qib javob qaytaradi.

---

### 6.4 Billz API - Savdo Hisoboti

**ID:** `OTZdTqxtVUzSstfE`  
**Node soni:** 5  
**Trigger:** Another Workflow

5 ta do'konning savdo ma'lumotini Billz API dan olib, formatlangan holda qaytaradi.

**Kiritish:** `start_date`, `end_date` (yyyy-MM-dd)  
**Chiqarish:** Do'konlar bo'yicha savdo summasi, mahsulot soni, jami, eng yaxshi do'kon

---

### 6.5 Hisobot - Davomat Ma'lumot

**ID:** `YgoNqfjbuhlQ9z15`  
**Node soni:** 4  
**Trigger:** Another Workflow

Berilgan sana bo'yicha barcha xodimlarning davomat ma'lumotini (kelish/ketish vaqti, kechikish, jarima) Sheets dan o'qib qaytaradi.

---

### 6.6 Savdo - Kiritish

**ID:** `K5CWn7cKHmp9HBEf`  
**Node soni:** 4  
**Trigger:** Another Workflow

Xodim guruhda yozgan savdo sonini (mahsulot soni) Sheets ga yozadi.

---

## 7. Avtomatik hisobot workflowlari

### 7.1 Hisobot - Kunlik Davomat Yuborish

**ID:** `2PeO8UrNDQhlAe0c` | **Faol:** Ha | **Node:** 3

Har kuni belgilangan vaqtda (ehtimol kech) davomat hisobotini avtomatik Telegramga yuboradi.

---

### 7.2 Hisobot - Kunlik To'liq (Admin)

**ID:** `449iGbY6ioIFFGFK` | **Faol:** Ha | **Node:** 6

Admin uchun to'liqroq kunlik hisobot: davomat + savdo ma'lumoti birga.

---

### 7.3 Hisobot - Haftalik

**ID:** `3iqDM2ryldBgzI6U` | **Faol:** Ha | **Node:** 10

**Node zanjiri:**

```
Schedule Trigger → JS (hafta sanalarini hisoblash)
                → Davomat ma'lumot olish (sub-workflow)    ┐
                → Savdo ma'lumot olish (Billz API)         ┘ → Merge
                → Format - Hisobot (JS)
                → Send a text message (Telegram — sodda hisobot)
                → AI Agent (Gemini — tahlil yozadi)
                → Send a text message (Telegram — AI tahlil)
```

**Haftalik hisobotda nima bo'ladi:**

- Barcha xodimlarning haftalik davomat statistikasi
- 5 do'konning haftalik savdo jami
- Gemini AI tomonidan tahlil va xulosa

---

### 7.4 Hisobot - Oylik

**ID:** `v3H442qb5RM4V3vT` | **Faol:** Ha | **Node:** 11

**Node zanjiri:**

```
Schedule Trigger → JS (oy sanalarini hisoblash)
                → Davomat ma'lumot olish    ┐
                → Savdo ma'lumot olish      ┘ → Merge
                → Format - Hisobot (JS)
                → Telegram - Davomat hisoboti
                → Telegram - Savdo hisoboti
                → AI Agent (Gemini tahlil)
                → Telegram - AI Tahlil (xulosa)
```

**Oylik hisobotda nima bo'ladi:**

- Xodimlar davomat jadvali (oylik)
- 5 do'kon savdo jami (oylik)
- Eng yaxshi va eng zaif ko'rsatkichlar
- Gemini AI tomonidan chuqur tahlil va tavsiyalar

---

### 7.5 Hisobot - Davomat Davr

**ID:** `JZVoSpNimi2I9HjQ` | **Faol:** Ha | **Node:** 3

Maxsus davr uchun davomat hisoboti (masalan, 1-15 aprel).

---

## 8. Google Sheets strukturasi

Loyihada **2 ta asosiy spreadsheet** ishlatiladi:

### 8.1 "Nazoratchi AI Agent" (asosiy)

**ID:** `1rRSOa30qQ4vQihke46UQE7U9Ik8yPlcjPGU-uwJMbFY`

| Sheet nomi    | Kolonkalar                                                      | Maqsad            |
| ------------- | --------------------------------------------------------------- | ----------------- |
| **Xodimlar**  | ism, bo'lim, telefon, ...                                       | Xodimlar ro'yxati |
| **Davomat**   | sana, ism, kelish, ketish, kechikish, jarima, ...               | Kunlik davomat    |
| **Tasdiqlar** | sana, ism, tur, vaqt, holat, admin, javob_vaqti, xabar_id, izoh | Ruxsat so'rovlari |

### 8.2 "Nazoratchi AI agent" (hisobotlar)

**ID:** `1T2tf2Bpe6ykPafPNCtKtfNIUOyXwDuJejPKS6odwCts`

| Sheet nomi     | Maqsad                              |
| -------------- | ----------------------------------- |
| **Hisobotlar** | Savdo va davomat hisobotlari arxivi |

---

## 9. Billz API integratsiyasi

Billz — O'zbekistonda keng tarqalgan POS (kassa) tizimi.

**5 ta do'kon Billz ID lari:**

```javascript
const DOKONLAR = {
  'Amir Kids':
  'Amir Premium':
  'Dubai House':
  'Dubai House Abu Sahiy':
  'Dubai House Afsona':
};
```

**API so'rovi formati:**

```
start_date: yyyy-MM-dd
end_date:   yyyy-MM-dd
```

**Qaytaradigan ma'lumot:**

- Har do'kon bo'yicha savdo summasi (so'm)
- Sotilgan mahsulotlar soni
- Tranzaksiyalar soni

---

### Ruxsatlar jadvali

| Amal                 | Xodim (guruhda)       | Xodim (shaxsiy) | Admin (shaxsiy) |
| -------------------- | --------------------- | --------------- | --------------- |
| Keldim/Ketdim yozish | ✅ (kalit so'z bilan) | ✅              | —               |
| Jarima rozilik       | ✅                    | ✅              | —               |
| Tasdiq so'rash       | ✅                    | ✅              | —               |
| Qoidalar ko'rish     | ❌                    | ❌              | ✅              |
| Davomat hisoboti     | ❌                    | ❌              | ✅              |
| Savdo hisoboti       | ❌                    | ❌              | ✅              |
| Callback tasdiq      | ❌                    | ❌              | ✅              |

> Admin guruhda xabar yozsa bot jim turadi — ataylab shunday qilingan.

---

## 11. Callback tizimi (tasdiq tugmalari)

Bu tizim xodim kech kelish yoki erta ketish so'raganda ishlaydi.

### Jarayon

```
1. Xodim: "Ertaga soat 10 da kelaman, sabab: shifokor"
2. AI Agent: Tasdiq - Router tool ni chaqiradi
3. Tasdiq - Router: Adminga inline button bilan xabar yuboradi
4. Admin: [✅ Tasdiqlash] yoki [❌ Rad etish] tugmasini bosadi
5. Callback: Nazoratchi Pro AI Agent ga keladi
6. Admin Check: Bosman admin ekanligini tekshiradi (3 admin ID)
7. Parse Callback: callback_data ni parse qiladi
8. Update Tasdiq Holati: Sheets dagi "holat" ustunini yangilaydi
9. Edit a text message: Admin guruhidagi xabarni yangilaydi (✅/❌ ko'rinadi)
10. Answer Query: Adminga popup xabar ("✅ tasdiqlandi" yoki "❌ rad etildi")
```

### Callback data formati

```
tasdiq_ok_Yusupov Hamidillo_20.04.2026_kech_kelish
tasdiq_no_Mirzaboyeva Oydina_21.04.2026_erta_ketish

Format: tasdiq_{ok|no}_{Ism Familiya}_{DD.MM.YYYY}_{kech_kelish|erta_ketish}
```

### Sheets da saqlanadigan ma'lumotlar

```
xabar_id    — Telegram message ID (yangilash uchun)
sana        — DD.MM.YYYY
ism         — Xodim ismi
tur         — kech_kelish | erta_ketish
vaqt        — HH:MM
holat       — kutilmoqda | tasdiqlandi | rad
admin       — Javob bergan admin ismi
javob_vaqti — DD.MM.YYYY HH:MM
izoh        — Qo'shimcha izoh
```

---

## 12. Xato holatlari va cheklovlar

### AI Agent xato qoidalari

| Holat                | Bot javobi                                     |
| -------------------- | ---------------------------------------------- |
| Ma'lumot topilmasa   | "Ma'lumot topilmadi"                           |
| API xato             | "Texnik xato, qayta urining"                   |
| Noaniq savol         | Aniqlashtiruvchi savol beradi                  |
| Soxta ma'lumot       | HECH QACHON yaratmaydi                         |
| Ro'yxatda yo'q xodim | "Iltimos, to'liq ism va familiyangizni yozing" |

### Tizim cheklovlari

- **Guruhda admin:** Bot admin yozgan xabarlarga guruhda javob bermaydi
- **Bir kunda 2 marta kelish:** Validator bloklaydi
- **Kelmasdan ketish:** Ketim yozsa xato qaytaradi
- **Xodim qoidalar so'rasa:** "Bu ma'lumot faqat adminlar uchun"
- **Xotira:** Har foydalanuvchi uchun 25 xabar (sessiya bo'yicha)
- **Callback:** Faqat 3 ta admin ID tasdiqlay oladi

---

## 13. GitHub backup tizimi

**ID:** `z8eXBFkjYmFDD97A` | **Faol:** Ha | **Node:** 4

Barcha n8n workflowlari avtomatik ravishda GitHub repozitoriyasiga zaxiralanadi.

- **Trigger:** Schedule (ehtimol har kuni yoki har hafta)
- **Jarayon:** n8n API → barcha workflowlar JSON → GitHub push
- **Maqsad:** Workflow yo'qolsa qayta tiklash imkoni

---

## 14. Arxivlangan va qo'shimcha workflowlar

### Hisobchi AI tizimi (alohida loyiha elementi)

`Hisobchi AI` prefiksi bilan 4 ta workflow bor — bu Nazoratchi tizimidan alohida bo'lib, moliyaviy tranzaksiyalarni kuzatish uchun mo'ljallangan:

| Workflow                          | ID                 | Node | Maqsad                     |
| --------------------------------- | ------------------ | ---- | -------------------------- |
| Hisobchi AI - Transaction Capture | `U1JT5QYXifKZ1ghA` | 43   | Tranzaksiya yozish (FAOL)  |
| Hisobchi AI - Kunlik Hisobot      | `E3G7q5STlyxiGgD0` | 7    | Kunlik moliyaviy hisobot   |
| Hisobchi AI - Haftalik Hisobot    | `gPu294eNqKF7hB5X` | 7    | Haftalik moliyaviy hisobot |
| Hisobchi AI - Oylik Hisobot       | `o401veUP5mVMpc8y` | 7    | Oylik moliyaviy hisobot    |

### Ijtimoiy tarmoq nazorati

| Workflow                 | ID                 | Maqsad                 |
| ------------------------ | ------------------ | ---------------------- |
| TikTok - Kiritish        | `bqwTvArZiA8t7BgF` | TikTok post kuzatuvi   |
| YouTube Kanal Nazoratchi | `gD0VCGJqlSw2P1BC` | YouTube kanal nazorati |
| Instagram                | `khHw1YdVjI371FwH` | Instagram nazorati     |

### Moliyachi workflowlari (yangi versiyalar)

- `Moliyachi 3.0` (`PWcq50xxrLFkDvdt`) — 13 node, nofaol (ishlab chiqilmoqda)
- `Moliyachi 2.0` (`c5kNHf1OvOkNO1Kk`) — nofaol
- `Moliyachi` (`gupE8HycxVrDDhy6`) — arxivlangan

---

## Tezkor ma'lumotnoma (Cheat Sheet)

### Asosiy Credential IDlar

| Servis        | Credential nomi                   | ID                 |
| ------------- | --------------------------------- | ------------------ |
| Telegram Bot  | Nazoratchi Pro AI Agent           | `I5WbmBVb2RZfEs9R` |
| Google Sheets | Google Sheets account             | `kc9D85zPwJvwiifb` |
| Google Gemini | Google Gemini(PaLM) Api account 2 | `jyIx4qKzq4JjHHzg` |

### Asosiy Spreadsheet IDlar

| Nom                              | Google Sheets ID                               |
| -------------------------------- | ---------------------------------------------- |
| Nazoratchi AI Agent (asosiy)     | `1rRSOa30qQ4vQihke46UQE7U9Ik8yPlcjPGU-uwJMbFY` |
| Nazoratchi AI agent (hisobotlar) | `1T2tf2Bpe6ykPafPNCtKtfNIUOyXwDuJejPKS6odwCts` |

### Workflow ID lar (tez topish uchun)

```
Nazoratchi Pro AI Agent   → 5pD5qWvPdGwD9fRA
Davomat - Router           → Uy8bvEWrFMd0Wn3N
Tasdiq - Router            → GOAPZhcBnh78mv54
Qoidalar - Router          → Hsj8tY8w6XndhYyy
Billz API - Savdo Hisoboti → OTZdTqxtVUzSstfE
Hisobot - Davomat Ma'lumot → YgoNqfjbuhlQ9z15
Savdo - Kiritish           → K5CWn7cKHmp9HBEf
Savdo - Hisobot            → pV6220B7BjI9qZYj
Hisobot - Haftalik         → 3iqDM2ryldBgzI6U
Hisobot - Oylik            → v3H442qb5RM4V3vT
GitHub - Workflow Backup   → z8eXBFkjYmFDD97A
```

---

_Hujjat oxiri. Savollar bo'lsa loyiha egasi Odilbek Samadof bilan bog'laning._

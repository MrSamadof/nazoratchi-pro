# Moslashuvchan smena soatlari + menejer xodim qo'shishi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3 ta smena soatini bazada tahrirlanadigan qilish, yangi xodim olganda smenani tanlash YOKI ish vaqtini qo'lda kiritish, va menejerga (faqat `employee` rolida) xodim qo'shish huquqini berish.

**Architecture:** Smena shablon soatlari `constants.ts` dan `AppSettings` bazasiga ko'chadi (`constants.SHIFTS` fallback bo'lib qoladi). Yangi `custom` smena turi qo'shiladi; `custom` xodimning soati `User` hujjatida saqlanadi. `schedulesService.getShiftWindow()` soatni bazadagi shablondan o'qiydi — shuning uchun attendance/jobs/penalties mantiqi o'zgarmaydi. Menejer uchun `/api/admin/*` ostida xodim CRUD endpointlari (server tomonida `employee`-only + do'kon scope) qo'shiladi.

**Tech Stack:** Express 5 + Mongoose (tsx, ESM, `.js` import), Zod DTO, Next.js 15 + RTK Query, vitest.

---

## ⚠️ Muhim eslatmalar (ishni boshlashdan oldin o'qing)

1. **Git yo'q.** Bu papka git repozitoriy emas (`git status` ishlamaydi). Shu sababli quyidagi "Checkpoint" qadamlari `git commit` o'rniga **typecheck/test** ishga tushirishdir. Agar commit kerak bo'lsa, avval `git init` qiling (ixtiyoriy).
2. **ESM import:** backend `src/`/`api/` ichida relative importlar `.js` kengaytma bilan yoziladi (fayl `.ts` bo'lsa ham).
3. **Mongoose model patterni:** har doim `mongoose.models.X ?? model('X', schema)`.
4. **Til: barcha foydalanuvchiga ko'rinadigan matn — O'zbek (lotin).**
5. **Buyruqlar repo root'dan ishlatiladi.** Backend testi: `cd backend && npx vitest run <file>`. Typecheck: `npm run typecheck` (ikkala tomon).

---

## File Structure

**Backend — o'zgartiriladi:**
- `backend/src/core/config/constants.ts` — `SHIFT_TYPES` ga `custom`, `SHIFTS` ga `custom` yozuvi, `FIXED_SHIFTS` ga `custom`, `SHIFT_TEMPLATE_KEYS`.
- `backend/src/modules/app-settings/app-settings.model.ts` — `shifts` subdocument.
- `backend/src/modules/app-settings/app-settings.service.ts` — `ShiftTemplate(s)` tiplari, `getShiftsConfig()`, `updateShiftsConfig()`, kesh.
- `backend/src/modules/schedules/schedules.service.ts` — `resolveTimes()`/`buildWindow()`/`getShiftWindow()`/`setShift()` shablonni bazadan o'qiydi + `custom`.
- `backend/src/modules/users/users.model.ts` — `defaultShiftStartTime`, `defaultShiftEndTime`.
- `backend/src/modules/users/users.dto.ts` — soat maydonlari + `custom` validatsiya (`superRefine`).
- `backend/src/modules/users/users.service.ts` — `create`/`update` soatni saqlaydi/tozalaydi.
- `backend/api/routes/ceo.ts` — `serializeUser` ni shared serializer bilan almashtirish.
- `backend/api/routes/admin.ts` — menejer xodim CRUD + `/admin/stores` + `/admin/shifts-config`.

**Backend — yangi:**
- `backend/src/modules/users/users.serializer.ts` — `serializeUser` (ceo + admin uchun umumiy).

**Frontend — o'zgartiriladi:**
- `frontend/shared/types.ts` — `ShiftType` ga `custom`, `SHIFT_META.custom`.
- `frontend/services/usersApi.ts` — `scope` parametri, `ApiUser`/`CreateUserBody` ga soat maydonlari.
- `frontend/components/ceo/users-manager.tsx` — "Qo'lda" smena + 2 soat input, `scope`/`allowedRoles` proplari.
- `frontend/app/(dashboard)/admin/employees/page.tsx` — `UsersManager` (scope=admin) + smena sozlamalari.
- `frontend/app/(ceo)/ceo/settings/page.tsx` — smena sozlamalari kartasi.

**Frontend — yangi:**
- `frontend/services/shiftsApi.ts` — `getShiftsConfig`/`updateShiftsConfig`.
- `frontend/components/ceo/shift-templates-manager.tsx` — 3 smena soatini tahrirlovchi karta.

---

## Phase A — Konstanta va tiplar poydevori

### Task A1: `custom` smena turini qo'shish (backend constants)

**Files:**
- Modify: `backend/src/core/config/constants.ts:41-55`

- [ ] **Step 1: `SHIFT_TYPES`, `SHIFTS`, `FIXED_SHIFTS` ni yangilash**

`backend/src/core/config/constants.ts` da 41-55 qatorlarni quyidagiga almashtiring:

```ts
export const SHIFT_TYPES = ['morning', 'evening', 'flexible', 'day_off', 'custom'] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const SHIFTS: Record<
  ShiftType,
  { label: string; startTime: string | null; endTime: string | null; hours: number | null }
> = {
  morning: { label: 'Ertalabki (08:00–18:00)', startTime: '08:00', endTime: '18:00', hours: 10 },
  evening: { label: 'Kechki (13:00–23:00)', startTime: '13:00', endTime: '23:00', hours: 10 },
  flexible: { label: "O'zgaruvchan (10 soat)", startTime: null, endTime: null, hours: 10 },
  day_off: { label: 'Dam olish', startTime: null, endTime: null, hours: null },
  // Qo'lda kiritiladigan smena — soat User hujjatida saqlanadi (shablon emas).
  custom: { label: "Qo'lda (maxsus)", startTime: null, endTime: null, hours: null },
};

/** Belgilangan (fixed) boshlanish/tugash vaqti bor smenalar — kech kelish/erta ketish shularga hisoblanadi. */
export const FIXED_SHIFTS: ShiftType[] = ['morning', 'evening', 'custom'];

/** Bazada (AppSettings) tahrirlanadigan shablon smenalar. */
export const SHIFT_TEMPLATE_KEYS = ['morning', 'evening', 'flexible'] as const;
export type ShiftTemplateKey = (typeof SHIFT_TEMPLATE_KEYS)[number];
```

- [ ] **Step 2: Checkpoint — backend typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS (xato yo'q). Eski kod `SHIFTS[shiftType]` ishlatadi — `custom` kalit qo'shilgani uchun `Record` to'liq, xato bermaydi.

### Task A2: `custom` smena turini qo'shish (frontend types)

**Files:**
- Modify: `frontend/shared/types.ts:9,34-39`

- [ ] **Step 1: `ShiftType` va `SHIFT_META` ni yangilash**

`frontend/shared/types.ts:9` ni:

```ts
export type ShiftType = 'morning' | 'evening' | 'flexible' | 'day_off' | 'custom';
```

va `SHIFT_META` (34-39) ga `custom` qatorini qo'shing:

```ts
export const SHIFT_META: Record<ShiftType, ShiftMeta> = {
  morning: { label: 'Ertalabki', short: '08–18', startTime: '08:00', endTime: '18:00', tone: 'accent' },
  evening: { label: 'Kechki', short: '13–23', startTime: '13:00', endTime: '23:00', tone: 'amber' },
  flexible: { label: "O'zgaruvchan", short: '10 soat', startTime: null, endTime: null, tone: 'emerald' },
  day_off: { label: 'Dam olish', short: 'Dam', startTime: null, endTime: null, tone: 'neutral' },
  custom: { label: "Qo'lda", short: 'Maxsus', startTime: null, endTime: null, tone: 'accent' },
};
```

- [ ] **Step 2: Checkpoint — frontend typecheck**

Run: `npm run typecheck`
Expected: PASS (yoki faqat keyingi tasklarda tuzatiladigan, hali yozilmagan maydonlarga oid xatolar bo'lmasligi kerak — bu bosqichda toza).

---

## Phase B — Tahrirlanadigan smena shablonlari (backend)

### Task B1: `AppSettings` modeliga `shifts` qo'shish

**Files:**
- Modify: `backend/src/modules/app-settings/app-settings.model.ts:15-36`

- [ ] **Step 1: `shifts` subdocument qo'shish**

`appSettingsSchema` ichiga (`updatedBy` dan oldin) qo'shing:

```ts
    // Smena shablonlari — soatlar bazada tahrirlanadi (constants.SHIFTS — fallback).
    // day_off va custom bu yerda yo'q (day_off doim soatsiz, custom — xodimga biriktiriladi).
    shifts: {
      type: new Schema(
        {
          morning: { label: String, startTime: String, endTime: String },
          evening: { label: String, startTime: String, endTime: String },
          flexible: { label: String, startTime: String, endTime: String },
        },
        { _id: false },
      ),
      default: null,
    },
```

- [ ] **Step 2: Checkpoint — typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS.

### Task B2: `AppSettingsService` — `getShiftsConfig`/`updateShiftsConfig`

**Files:**
- Modify: `backend/src/modules/app-settings/app-settings.service.ts`
- Test: `backend/test/app-settings.shifts.test.ts`

- [ ] **Step 1: Failing test yozish**

`backend/test/app-settings.shifts.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { appSettingsService } from '../src/modules/app-settings/app-settings.service.js';
import { AppSettings } from '../src/modules/app-settings/app-settings.model.js';

afterEach(async () => {
  await AppSettings.deleteMany({});
  appSettingsService.invalidate();
});

describe('AppSettingsService shift templates', () => {
  it('returns constants defaults when nothing is stored', async () => {
    const cfg = await appSettingsService.getShiftsConfig();
    expect(cfg.morning.startTime).toBe('08:00');
    expect(cfg.evening.endTime).toBe('23:00');
    expect(cfg.flexible.startTime).toBeNull();
  });

  it('persists and reads back an edited template', async () => {
    await appSettingsService.updateShiftsConfig(
      { morning: { label: 'Ertalabki', startTime: '09:00', endTime: '19:00' } },
      null,
    );
    const cfg = await appSettingsService.getShiftsConfig();
    expect(cfg.morning.startTime).toBe('09:00');
    expect(cfg.morning.endTime).toBe('19:00');
    // Tegmagan shablon — default qoladi
    expect(cfg.evening.startTime).toBe('13:00');
  });
});
```

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/app-settings.shifts.test.ts`
Expected: FAIL — `getShiftsConfig`/`updateShiftsConfig` mavjud emas.

- [ ] **Step 3: Service ga tiplar va metodlarni qo'shish**

`backend/src/modules/app-settings/app-settings.service.ts` boshiga importga `SHIFTS`, `SHIFT_TEMPLATE_KEYS`, `type ShiftTemplateKey` ni qo'shing:

```ts
import { SHIFTS, SHIFT_TEMPLATE_KEYS, type ShiftTemplateKey } from '../../core/config/constants.js';
```

Tip va interfeyslarni (fayl yuqorisida, `DecryptedSettings` yonida) qo'shing:

```ts
export interface ShiftTemplate {
  label: string;
  startTime: string | null;
  endTime: string | null;
}
export type ShiftTemplates = Record<ShiftTemplateKey, ShiftTemplate>;
export type ShiftTemplatesPatch = Partial<Record<ShiftTemplateKey, ShiftTemplate>>;
```

Klass ichiga (kesh maydoni `cache` yonida) qo'shing:

```ts
  private shiftsCache: { value: ShiftTemplates; at: number } | null = null;

  /** Smena shablonlari — bazadan, bo'sh bo'lsa constants.SHIFTS default. Qisqa TTL kesh. */
  async getShiftsConfig(): Promise<ShiftTemplates> {
    const now = Date.now();
    if (this.shiftsCache && now - this.shiftsCache.at < CACHE_TTL_MS) {
      return this.shiftsCache.value;
    }
    const doc = await this.getDoc();
    const stored = (doc.shifts ?? {}) as Partial<
      Record<ShiftTemplateKey, Partial<ShiftTemplate>>
    >;
    const build = (key: ShiftTemplateKey): ShiftTemplate => ({
      label: stored[key]?.label || SHIFTS[key].label,
      startTime: stored[key]?.startTime ?? SHIFTS[key].startTime,
      endTime: stored[key]?.endTime ?? SHIFTS[key].endTime,
    });
    const value = {
      morning: build('morning'),
      evening: build('evening'),
      flexible: build('flexible'),
    } as ShiftTemplates;
    this.shiftsCache = { value, at: now };
    return value;
  }

  /** Smena shablonlarini yangilash (faqat berilgan kalitlar). */
  async updateShiftsConfig(
    patch: ShiftTemplatesPatch,
    updatedBy: Types.ObjectId | string | null,
  ): Promise<ShiftTemplates> {
    const doc = await this.getDoc();
    const current = (doc.shifts ?? {}) as Record<string, ShiftTemplate>;
    const next: Record<string, ShiftTemplate> = { ...current };
    for (const key of SHIFT_TEMPLATE_KEYS) {
      const p = patch[key];
      if (!p) continue;
      next[key] = {
        label: p.label ?? SHIFTS[key].label,
        startTime: p.startTime ?? null,
        endTime: p.endTime ?? null,
      };
    }
    doc.set('shifts', next);
    if (updatedBy !== undefined) {
      doc.updatedBy = (updatedBy as Types.ObjectId) ?? null;
    }
    await doc.save();
    this.shiftsCache = null;
    return this.getShiftsConfig();
  }
```

`invalidate()` metodiga `shiftsCache` ni ham tozalashni qo'shing:

```ts
  invalidate(): void {
    this.cache = null;
    this.shiftsCache = null;
  }
```

- [ ] **Step 4: Test pass bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/app-settings.shifts.test.ts`
Expected: PASS.

### Task B3: Menejer-ochiq smena sozlama endpointlari

**Files:**
- Modify: `backend/api/routes/admin.ts`

- [ ] **Step 1: Importlarni qo'shish**

`backend/api/routes/admin.ts` importlariga qo'shing:

```ts
import { appSettingsService } from '../../src/modules/app-settings/app-settings.service.js';
import { SHIFT_TEMPLATE_KEYS } from '../../src/core/config/constants.js';
```

- [ ] **Step 2: GET/PUT `/admin/shifts-config` qo'shish**

`admin.ts` oxiriga (oxirgi route'dan keyin) qo'shing:

```ts
const timeStr = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt HH:mm formatda bo'lishi kerak")
  .nullable();

const shiftTemplateDto = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  startTime: timeStr.optional(),
  endTime: timeStr.optional(),
});

const updateShiftsDto = z.object({
  morning: shiftTemplateDto.optional(),
  evening: shiftTemplateDto.optional(),
  flexible: shiftTemplateDto.optional(),
});

adminRouter.get('/shifts-config', async (_req: Request, res: Response) => {
  await connectDatabase();
  const shifts = await appSettingsService.getShiftsConfig();
  res.json({ ok: true, shifts });
});

adminRouter.put('/shifts-config', async (req: Request, res: Response) => {
  try {
    const dto = updateShiftsDto.parse(req.body);
    // morning/evening uchun ikkala vaqt ham bo'lishi va start < end bo'lishi shart.
    for (const key of ['morning', 'evening'] as const) {
      const t = dto[key];
      if (t && (t.startTime || t.endTime)) {
        if (!t.startTime || !t.endTime) {
          res.status(400).json({ ok: false, error: "Boshlanish va tugash vaqti to'liq bo'lishi kerak" });
          return;
        }
        if (t.startTime >= t.endTime) {
          res.status(400).json({ ok: false, error: "Boshlanish vaqti tugashdan oldin bo'lishi kerak" });
          return;
        }
      }
    }
    await connectDatabase();
    const shifts = await appSettingsService.updateShiftsConfig(dto, req.auth!.user._id);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'AppSettings',
      meta: { op: 'shifts_config', keys: SHIFT_TEMPLATE_KEYS.filter((k) => dto[k]) },
    });
    res.json({ ok: true, shifts });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    throw err;
  }
});
```

- [ ] **Step 3: Checkpoint — typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS.

---

## Phase C — schedules.service shablonni bazadan o'qiydi + custom

### Task C1: `getShiftWindow` shablonni bazadan oladi va `custom` ni hal qiladi

**Files:**
- Modify: `backend/src/modules/schedules/schedules.service.ts`
- Test: `backend/test/schedules.service.test.ts`

- [ ] **Step 1: Failing test yozish**

`backend/test/schedules.service.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { schedulesService } from '../src/modules/schedules/schedules.service.js';
import { appSettingsService } from '../src/modules/app-settings/app-settings.service.js';
import { AppSettings } from '../src/modules/app-settings/app-settings.model.js';
import { User, type UserDoc } from '../src/modules/users/users.model.js';

afterEach(async () => {
  await Promise.all([User.deleteMany({}), AppSettings.deleteMany({})]);
  appSettingsService.invalidate();
});

async function makeUser(over: Record<string, unknown> = {}): Promise<UserDoc> {
  return (await User.create({
    firstName: 'X',
    phone: `9989${Math.floor(Math.random() * 1e7)}`,
    passwordHash: 'x',
    role: 'employee',
    isApproved: true,
    isActive: true,
    ...over,
  })) as UserDoc;
}

describe('schedulesService.getShiftWindow', () => {
  it('resolves a template shift from the DB-edited times', async () => {
    await appSettingsService.updateShiftsConfig(
      { morning: { label: 'Ertalabki', startTime: '09:00', endTime: '19:00' } },
      null,
    );
    const user = await makeUser({ defaultShiftType: 'morning' });
    const win = await schedulesService.getShiftWindow(user._id);
    expect(win.resolved).toBe(true);
    expect(win.startTime).toBe('09:00');
    expect(win.endTime).toBe('19:00');
    expect(win.fixed).toBe(true);
  });

  it('resolves a custom shift from the user own hours', async () => {
    const user = await makeUser({
      defaultShiftType: 'custom',
      defaultShiftStartTime: '10:30',
      defaultShiftEndTime: '20:30',
    });
    const win = await schedulesService.getShiftWindow(user._id);
    expect(win.shiftType).toBe('custom');
    expect(win.startTime).toBe('10:30');
    expect(win.endTime).toBe('20:30');
    expect(win.fixed).toBe(true);
  });

  it('keeps flexible without fixed times', async () => {
    const user = await makeUser({ defaultShiftType: 'flexible' });
    const win = await schedulesService.getShiftWindow(user._id);
    expect(win.startTime).toBeNull();
    expect(win.fixed).toBe(false);
  });
});
```

> Eslatma: bu test `User` modelida `defaultShiftStartTime`/`defaultShiftEndTime` maydonlariga tayanadi — ular Task D1 da qo'shiladi. Agar C ni D dan oldin bajarsangiz, "custom" testi maydon yo'qligi sababli yiqiladi; D1 dan keyin yashil bo'ladi. Tartibni saqlang yoki D1 ni avval bajaring.

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/schedules.service.test.ts`
Expected: FAIL — hozir `getShiftWindow` soatni `constants.SHIFTS` dan oladi, DB tahririni va `custom` ni bilmaydi.

- [ ] **Step 3: `schedules.service.ts` ni yangilash**

Importga qo'shing:

```ts
import { appSettingsService, type ShiftTemplates } from '../app-settings/app-settings.service.js';
```

`resolveTimes` ni almashtiring (33-43):

```ts
  private resolveTimes(
    shiftType: ShiftType,
    templates: ShiftTemplates,
    startTime?: string,
    endTime?: string,
  ): { startTime: string | null; endTime: string | null } {
    if (shiftType === 'day_off') return { startTime: null, endTime: null };
    if (shiftType === 'custom') {
      return { startTime: startTime || null, endTime: endTime || null };
    }
    // morning | evening | flexible — shablondan (DB yoki default)
    const def = templates[shiftType];
    return {
      startTime: startTime || def.startTime,
      endTime: endTime || def.endTime,
    };
  }
```

`buildWindow` ni almashtiring (46-64):

```ts
  private buildWindow(
    shiftType: ShiftType,
    hasSchedule: boolean,
    templates: ShiftTemplates,
    startTime?: string,
    endTime?: string,
  ): ShiftWindow {
    const isDayOff = shiftType === 'day_off';
    const fixed = FIXED_SHIFTS.includes(shiftType);
    const t = this.resolveTimes(shiftType, templates, startTime, endTime);
    return {
      hasSchedule,
      resolved: true,
      shiftType,
      startTime: isDayOff ? null : t.startTime,
      endTime: isDayOff ? null : t.endTime,
      fixed,
      isDayOff,
    };
  }
```

`getShiftWindow` ni almashtiring (71-105):

```ts
  async getShiftWindow(
    userId: Types.ObjectId,
    date: Date = startOfTashkentDay(),
  ): Promise<ShiftWindow> {
    const day = startOfTashkentDay(date);
    const templates = await appSettingsService.getShiftsConfig();
    const sched = await Schedule.findOne({ userId, date: day });

    // 1) O'sha kunga alohida jadval yozuvi bor — eng yuqori ustuvorlik.
    if (sched) {
      return this.buildWindow(
        sched.shiftType as ShiftType,
        true,
        templates,
        sched.startTime,
        sched.endTime,
      );
    }

    // 2) Jadval yo'q — xodimning doimiy (default) smenasiga tushamiz.
    const user = await User.findById(userId).select(
      'defaultShiftType defaultShiftStartTime defaultShiftEndTime',
    );
    const def = user?.defaultShiftType as ShiftType | null | undefined;
    if (def) {
      return this.buildWindow(
        def,
        false,
        templates,
        user?.defaultShiftStartTime ?? undefined,
        user?.defaultShiftEndTime ?? undefined,
      );
    }

    // 3) Hech narsa yo'q — chaqiruvchi do'kon standart vaqtini ishlatadi.
    return {
      hasSchedule: false,
      resolved: false,
      shiftType: null,
      startTime: null,
      endTime: null,
      fixed: false,
      isDayOff: false,
    };
  }
```

`setShift` ichidagi `resolveTimes` chaqiruvini yangilang (121-126): avval shablonni oling, keyin uzating:

```ts
    const day = startOfTashkentDay(params.date);
    const templates = await appSettingsService.getShiftsConfig();
    const { startTime, endTime } = this.resolveTimes(
      params.shiftType,
      templates,
      params.startTime,
      params.endTime,
    );
```

- [ ] **Step 4: Test pass bo'lishini tekshirish (D1 dan keyin)**

Run: `cd backend && npx vitest run test/schedules.service.test.ts`
Expected: PASS (User modeli yangilangach — Task D1).

---

## Phase D — Xodim qo'lda soati (User)

### Task D1: `User` modeliga soat maydonlari

**Files:**
- Modify: `backend/src/modules/users/users.model.ts:33`

- [ ] **Step 1: Maydonlarni qo'shish**

`backend/src/modules/users/users.model.ts:33` (`defaultShiftType` dan keyin) qo'shing:

```ts
    defaultShiftType: { type: String, enum: [...SHIFT_TYPES, null], default: null },
    // Faqat defaultShiftType === 'custom' bo'lganda to'ladi — "HH:mm".
    defaultShiftStartTime: { type: String, default: null },
    defaultShiftEndTime: { type: String, default: null },
```

- [ ] **Step 2: Checkpoint — typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS.

### Task D2: DTO — soat maydonlari + `custom` validatsiya

**Files:**
- Modify: `backend/src/modules/users/users.dto.ts`
- Test: `backend/test/users.dto.test.ts`

- [ ] **Step 1: Failing test yozish**

`backend/test/users.dto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createUserDto } from '../src/modules/users/users.dto.js';

const base = {
  firstName: 'Aziz',
  phone: '998901234567',
  password: '1234',
  role: 'employee' as const,
};

describe('createUserDto custom shift validation', () => {
  it('accepts a custom shift with both times', () => {
    const parsed = createUserDto.parse({
      ...base,
      defaultShiftType: 'custom',
      defaultShiftStartTime: '09:00',
      defaultShiftEndTime: '18:00',
    });
    expect(parsed.defaultShiftStartTime).toBe('09:00');
  });

  it('rejects a custom shift missing the end time', () => {
    expect(() =>
      createUserDto.parse({
        ...base,
        defaultShiftType: 'custom',
        defaultShiftStartTime: '09:00',
      }),
    ).toThrow();
  });

  it('rejects a custom shift where start >= end', () => {
    expect(() =>
      createUserDto.parse({
        ...base,
        defaultShiftType: 'custom',
        defaultShiftStartTime: '18:00',
        defaultShiftEndTime: '09:00',
      }),
    ).toThrow();
  });

  it('accepts a normal template shift without custom times', () => {
    const parsed = createUserDto.parse({ ...base, defaultShiftType: 'morning' });
    expect(parsed.defaultShiftType).toBe('morning');
  });
});
```

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/users.dto.test.ts`
Expected: FAIL — soat maydonlari va validatsiya yo'q.

- [ ] **Step 3: DTO ni yangilash**

`backend/src/modules/users/users.dto.ts` ga vaqt sxemasi va `superRefine` qo'shing. Avval (boshqa kichik sxemalar yonida):

```ts
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt HH:mm formatda bo'lishi kerak");
```

`createUserDto` obyektiga maydonlarni qo'shing (`defaultShiftType` dan keyin):

```ts
  defaultShiftType: z.enum(SHIFT_TYPES).nullable().optional(),
  defaultShiftStartTime: timeSchema.nullable().optional(),
  defaultShiftEndTime: timeSchema.nullable().optional(),
```

`createUserDto` ni `z.object({...})` dan keyin `.superRefine` bilan o'rang. Ya'ni:

```ts
export const createUserDto = z
  .object({
    firstName: z.string().trim().min(2, "Ism kamida 2 belgi bo'lishi kerak").max(50),
    lastName: z.string().trim().max(50).optional().default(''),
    phone: phoneSchema,
    password: pinSchema,
    role: z.enum(USER_ROLES).default('employee'),
    storeId: objectIdSchema.nullable().optional(),
    division: z.enum(DIVISIONS).nullable().optional(),
    defaultShiftType: z.enum(SHIFT_TYPES).nullable().optional(),
    defaultShiftStartTime: timeSchema.nullable().optional(),
    defaultShiftEndTime: timeSchema.nullable().optional(),
    isApproved: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.defaultShiftType === 'custom') {
      if (!v.defaultShiftStartTime || !v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Qo'lda smena uchun boshlanish va tugash vaqti kerak",
          path: ['defaultShiftStartTime'],
        });
      } else if (v.defaultShiftStartTime >= v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Boshlanish vaqti tugashdan oldin bo'lishi kerak",
          path: ['defaultShiftStartTime'],
        });
      }
    }
  });
```

`updateUserDto` ni shu maydonlar bilan kengaytiring. `.partial()` `superRefine` bilan ishlashi uchun obyektni avval `.partial()`, keyin `.superRefine` qiling:

```ts
export const updateUserDto = z
  .object({
    firstName: z.string().trim().min(2).max(50),
    lastName: z.string().trim().max(50),
    phone: phoneSchema,
    role: z.enum(USER_ROLES),
    storeId: objectIdSchema.nullable(),
    division: z.enum(DIVISIONS).nullable(),
    defaultShiftType: z.enum(SHIFT_TYPES).nullable(),
    defaultShiftStartTime: timeSchema.nullable(),
    defaultShiftEndTime: timeSchema.nullable(),
    isApproved: z.boolean(),
    isActive: z.boolean(),
  })
  .partial()
  .superRefine((v, ctx) => {
    if (v.defaultShiftType === 'custom') {
      if (!v.defaultShiftStartTime || !v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Qo'lda smena uchun boshlanish va tugash vaqti kerak",
          path: ['defaultShiftStartTime'],
        });
      } else if (v.defaultShiftStartTime >= v.defaultShiftEndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Boshlanish vaqti tugashdan oldin bo'lishi kerak",
          path: ['defaultShiftStartTime'],
        });
      }
    }
  });
```

- [ ] **Step 4: Test pass bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/users.dto.test.ts`
Expected: PASS.

### Task D3: `UsersService` — soatni saqlash/tozalash

**Files:**
- Modify: `backend/src/modules/users/users.service.ts:97-161`
- Test: `backend/test/users.service.shift.test.ts`

- [ ] **Step 1: Failing test yozish**

`backend/test/users.service.shift.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { usersService } from '../src/modules/users/users.service.js';
import { User } from '../src/modules/users/users.model.js';

afterEach(async () => {
  await User.deleteMany({});
});

const base = {
  firstName: 'Aziz',
  lastName: '',
  password: '1234',
  role: 'employee' as const,
  isApproved: true,
  isActive: true,
};

describe('UsersService custom shift persistence', () => {
  it('stores custom hours on create', async () => {
    const u = await usersService.create({
      ...base,
      phone: '998900000001',
      defaultShiftType: 'custom',
      defaultShiftStartTime: '10:00',
      defaultShiftEndTime: '20:00',
    });
    expect(u.defaultShiftType).toBe('custom');
    expect(u.defaultShiftStartTime).toBe('10:00');
    expect(u.defaultShiftEndTime).toBe('20:00');
  });

  it('clears custom hours when switching to a template shift', async () => {
    const u = await usersService.create({
      ...base,
      phone: '998900000002',
      defaultShiftType: 'custom',
      defaultShiftStartTime: '10:00',
      defaultShiftEndTime: '20:00',
    });
    const updated = await usersService.update(u._id, { defaultShiftType: 'morning' });
    expect(updated!.defaultShiftType).toBe('morning');
    expect(updated!.defaultShiftStartTime).toBeNull();
    expect(updated!.defaultShiftEndTime).toBeNull();
  });
});
```

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/users.service.shift.test.ts`
Expected: FAIL — `create`/`update` soatni saqlamaydi/tozalamaydi.

- [ ] **Step 3: `create()` ni yangilash**

`users.service.ts` `create()` ichidagi `User.create({...})` obyektiga (118-qator atrofida, `defaultShiftType` dan keyin) qo'shing:

```ts
      defaultShiftType: isCeo ? null : (dto.defaultShiftType ?? null),
      defaultShiftStartTime:
        !isCeo && dto.defaultShiftType === 'custom' ? (dto.defaultShiftStartTime ?? null) : null,
      defaultShiftEndTime:
        !isCeo && dto.defaultShiftType === 'custom' ? (dto.defaultShiftEndTime ?? null) : null,
```

- [ ] **Step 4: `update()` ni yangilash**

`users.service.ts` `update()` ichida, `patch` qurilgandan keyin (138-qatordan keyin) qo'shing:

```ts
    // Smena soatlari — faqat 'custom' bo'lganda saqlanadi, aks holda tozalanadi.
    if ('defaultShiftType' in dto) {
      if (dto.defaultShiftType === 'custom') {
        patch.defaultShiftStartTime = dto.defaultShiftStartTime ?? null;
        patch.defaultShiftEndTime = dto.defaultShiftEndTime ?? null;
      } else {
        patch.defaultShiftStartTime = null;
        patch.defaultShiftEndTime = null;
      }
    }
```

Va CEO bloki (149-153) ham soatni tozalasin:

```ts
    if (effectiveRole === 'ceo') {
      patch.storeId = null;
      patch.defaultShiftType = null;
      patch.defaultShiftStartTime = null;
      patch.defaultShiftEndTime = null;
    }
```

- [ ] **Step 5: Test pass bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/users.service.shift.test.ts`
Expected: PASS.

### Task D4: `serializeUser` ni shared serializer'ga chiqarish + soat maydonlari

**Files:**
- Create: `backend/src/modules/users/users.serializer.ts`
- Modify: `backend/api/routes/ceo.ts:266-292,335,357`

- [ ] **Step 1: Shared serializer yaratish**

`backend/src/modules/users/users.serializer.ts`:

```ts
import type { usersService } from './users.service.js';

type AnyUser = Awaited<ReturnType<typeof usersService.findById>>;

/** User hujjatini API javobiga aylantiradi (ceo + admin route'lari uchun umumiy). */
export function serializeUser(u: AnyUser) {
  if (!u) return null;
  const store = u.storeId as unknown as
    | { _id: { toString(): string }; name: string; slug?: string }
    | null;
  return {
    id: u._id.toString(),
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    division: u.division ?? null,
    defaultShiftType: u.defaultShiftType ?? null,
    defaultShiftStartTime: u.defaultShiftStartTime ?? null,
    defaultShiftEndTime: u.defaultShiftEndTime ?? null,
    isActive: u.isActive,
    isApproved: u.isApproved,
    storeId:
      store && typeof store === 'object' && 'name' in store
        ? store._id.toString()
        : u.storeId
          ? u.storeId.toString()
          : null,
    storeName: store && typeof store === 'object' && 'name' in store ? store.name : null,
    telegramId: u.telegramId,
    telegramUsername: u.telegramUsername,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    deletedAt: u.deletedAt,
  };
}
```

- [ ] **Step 2: `ceo.ts` dan local `serializeUser` ni o'chirib, importni qo'shish**

`backend/api/routes/ceo.ts` da 266-292 qatorlardagi `function serializeUser(...) {...}` ni o'chiring va importlar orasiga qo'shing:

```ts
import { serializeUser } from '../../src/modules/users/users.serializer.js';
```

`ceoRouter.get('/users')` (335) va `get('/users/:id')` (357) dagi `serializeUser` chaqiruvlari o'zgarmaydi — endi importdan keladi.

- [ ] **Step 3: Checkpoint — typecheck + tegishli testlar**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS.
Run: `cd backend && npx vitest run test/schedules.service.test.ts`
Expected: PASS (endi User soat maydonlari mavjud — Task C1 testi to'liq yashil).

---

## Phase E — Menejer xodim CRUD (backend)

### Task E1: Menejer-ochiq stores ro'yxati

**Files:**
- Modify: `backend/api/routes/admin.ts`

- [ ] **Step 1: `GET /admin/stores` qo'shish**

Importga qo'shing:

```ts
import { Store } from '../../src/modules/stores/stores.model.js';
```

`admin.ts` ga route qo'shing (employees route yonida):

```ts
adminRouter.get('/stores', async (req: Request, res: Response) => {
  await connectDatabase();
  const scope = managerStoreScope(req);
  const filter: Record<string, unknown> = { isActive: true };
  if (scope) filter._id = scope;
  const stores = await Store.find(filter).select('name').sort({ name: 1 });
  res.json({ ok: true, stores: stores.map((s) => ({ id: s._id.toString(), name: s.name })) });
});
```

> Eslatma: `Store` modelida `isActive` maydoni bo'lmasa, `filter` dan `isActive` ni olib tashlang (avval `stores.model.ts` ni tekshiring).

- [ ] **Step 2: Checkpoint — typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS.

### Task E2: Menejer xodim CRUD endpointlari (employee-only + scope)

**Files:**
- Modify: `backend/api/routes/admin.ts`
- Test: `backend/test/admin-users.permission.test.ts`

- [ ] **Step 1: Failing test yozish (ruxsat mantig'i — sof funksiyani sinash)**

Ruxsat qoidasi route ichida. Uni sinash uchun kichik yordamchi funksiyani ajratamiz va sinaymiz. `admin.ts` ga (route'lardan oldin) qo'shing:

```ts
/** Menejer xodim CRUD ruxsatini tekshiradi. role faqat 'employee'. */
export function canManageAsEmployee(role: string | undefined): boolean {
  return role === undefined || role === 'employee';
}
```

`backend/test/admin-users.permission.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canManageAsEmployee } from '../api/routes/admin.js';

describe('canManageAsEmployee', () => {
  it('allows undefined (no role change)', () => {
    expect(canManageAsEmployee(undefined)).toBe(true);
  });
  it('allows employee', () => {
    expect(canManageAsEmployee('employee')).toBe(true);
  });
  it('blocks manager and ceo', () => {
    expect(canManageAsEmployee('manager')).toBe(false);
    expect(canManageAsEmployee('ceo')).toBe(false);
  });
});
```

- [ ] **Step 2: Test fail bo'lishini tekshirish**

Run: `cd backend && npx vitest run test/admin-users.permission.test.ts`
Expected: FAIL — `canManageAsEmployee` hali eksport qilinmagan (agar Step 1 dagi funksiyani qo'shmagan bo'lsangiz).

> Agar funksiyani Step 1 da qo'shgan bo'lsangiz, test darhol PASS bo'lishi mumkin — bu maqbul (ruxsat mantig'i izolyatsiya qilingan). Davom eting.

- [ ] **Step 3: CRUD route'larini qo'shish**

Importlarni to'ldiring:

```ts
import { usersService, UsersError } from '../../src/modules/users/users.service.js';
import { createUserDto, updateUserDto, resetPinDto } from '../../src/modules/users/users.dto.js';
import { serializeUser } from '../../src/modules/users/users.serializer.js';
```

(`usersService` allaqachon import qilingan bo'lsa, takrorlamang.)

`admin.ts` ga route'lar (employees route'dan keyin):

```ts
// Menejer/CEO — xodimlar ro'yxati (to'liq shakl, do'kon scope)
adminRouter.get('/users', async (req: Request, res: Response) => {
  await connectDatabase();
  const scope = managerStoreScope(req);
  const sp = new URLSearchParams(req.query as Record<string, string>);
  const filter: Record<string, unknown> = { role: 'employee' };
  if (scope) filter.storeId = scope;
  if (sp.get('includeDeleted') !== 'true') filter.isActive = true;

  const list = await User.find(filter)
    .populate('storeId', 'name slug')
    .sort({ lastName: 1, firstName: 1 })
    .limit(200);
  res.json({ ok: true, users: list.map(serializeUser) });
});

// Menejer/CEO — xodim qo'shish (faqat employee)
adminRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const dto = createUserDto.parse(req.body);
    if (!canManageAsEmployee(dto.role)) {
      res.status(403).json({ ok: false, error: "Menejer faqat xodim qo'sha oladi" });
      return;
    }
    dto.role = 'employee';
    await connectDatabase();
    const scope = managerStoreScope(req);
    if (scope) dto.storeId = scope.toString();
    const created = await usersService.create(dto);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'User',
      targetId: created._id,
      meta: { op: 'create', role: 'employee', phone: created.phone },
    });
    res.json({ ok: true, id: created._id.toString() });
  } catch (err) {
    if (err instanceof UsersError) {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    throw err;
  }
});

// Helper: menejer faqat o'z scope'idagi employee'ni boshqaradi.
async function loadManagedEmployee(req: Request, res: Response, id: string) {
  const target = await usersService.findById(id);
  if (!target) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return null;
  }
  if (target.role !== 'employee') {
    res.status(403).json({ ok: false, error: 'Faqat xodimni boshqara olasiz' });
    return null;
  }
  const scope = managerStoreScope(req);
  if (scope && target.storeId?.toString() !== scope.toString()) {
    res.status(403).json({ ok: false, error: "Bu xodim sizning do'koningizdan emas" });
    return null;
  }
  return target;
}

adminRouter.patch('/users/:id', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const dto = updateUserDto.parse(req.body);
    if (!canManageAsEmployee(dto.role)) {
      res.status(403).json({ ok: false, error: "Xodim rolini o'zgartira olmaysiz" });
      return;
    }
    await connectDatabase();
    const target = await loadManagedEmployee(req, res, id);
    if (!target) return;
    // Menejer xodimni boshqa do'konga ko'chira olmasin (CEO mumkin).
    const scope = managerStoreScope(req);
    if (scope) delete (dto as Record<string, unknown>).storeId;
    delete (dto as Record<string, unknown>).role;
    const updated = await usersService.update(id, dto);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'User',
      targetId: updated!._id,
      meta: { op: 'update', changes: dto },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof UsersError) {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    throw err;
  }
});

adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const target = await loadManagedEmployee(req, res, id);
  if (!target) return;
  await usersService.deactivate(new Types.ObjectId(id));
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'user.deactivated',
    targetType: 'User',
    targetId: target._id,
    meta: { op: 'delete' },
  });
  res.json({ ok: true });
});

adminRouter.post('/users/:id/restore', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const target = await loadManagedEmployee(req, res, id);
  if (!target) return;
  await usersService.restore(new Types.ObjectId(id));
  res.json({ ok: true });
});

adminRouter.post('/users/:id/reset-pin', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const dto = resetPinDto.parse(req.body);
    await connectDatabase();
    const target = await loadManagedEmployee(req, res, id);
    if (!target) return;
    await usersService.resetPin(id, dto.password);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'User',
      targetId: target._id,
      meta: { op: 'reset_pin' },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    throw err;
  }
});
```

- [ ] **Step 4: Checkpoint — typecheck + permission test**

Run: `cd backend && npx tsc --noEmit`
Expected: PASS.
Run: `cd backend && npx vitest run test/admin-users.permission.test.ts`
Expected: PASS.

---

## Phase F — Frontend

### Task F1: `usersApi` — `scope` parametri + soat maydonlari

**Files:**
- Modify: `frontend/services/usersApi.ts`

- [ ] **Step 1: `ApiUser`/`CreateUserBody` ga soat maydonlari**

`frontend/services/usersApi.ts` `ApiUser` ga qo'shing (`defaultShiftType` dan keyin):

```ts
  defaultShiftType: ShiftType | null;
  defaultShiftStartTime: string | null;
  defaultShiftEndTime: string | null;
```

`CreateUserBody` ga:

```ts
  defaultShiftType?: ShiftType | null;
  defaultShiftStartTime?: string | null;
  defaultShiftEndTime?: string | null;
```

- [ ] **Step 2: `scope` qo'shish (URL ceo|admin)**

Endpointlarni `scope` qabul qiladigan qilib o'zgartiring. `listUsers` arg tipiga `scope?: 'ceo' | 'admin'` qo'shing va URL'ni quring:

```ts
    listUsers: build.query<
      ApiUser[],
      { limit?: number; includeDeleted?: boolean; scope?: 'ceo' | 'admin' } | void
    >({
      query: (arg) => {
        const scope = arg?.scope ?? 'ceo';
        if (scope === 'admin') {
          const includeDeleted = arg?.includeDeleted ? '?includeDeleted=true' : '';
          return `/admin/users${includeDeleted}`;
        }
        const limit = arg?.limit ?? 100;
        const includeDeleted = arg?.includeDeleted ? '&includeDeleted=true' : '';
        return `/ceo/users?limit=${limit}${includeDeleted}`;
      },
      transformResponse: (res: { ok: boolean; users: ApiUser[] }) => res.users ?? [],
      providesTags: (users) =>
        users
          ? [...users.map((u) => ({ type: 'User' as const, id: u.id })), { type: 'User' as const, id: 'LIST' }]
          : [{ type: 'User', id: 'LIST' }],
    }),

    createUser: build.mutation<
      { ok: boolean; error?: string },
      CreateUserBody & { scope?: 'ceo' | 'admin' }
    >({
      query: ({ scope = 'ceo', ...body }) => ({
        url: scope === 'admin' ? '/admin/users' : '/ceo/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    updateUser: build.mutation<
      { ok: boolean; error?: string },
      { id: string; body: UpdateUserBody; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, body, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}` : `/ceo/users/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'User', id: arg.id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    deactivateUser: build.mutation<
      { ok: boolean; error?: string },
      { id: string; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}` : `/ceo/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'User', id: arg.id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    restoreUser: build.mutation<
      { ok: boolean; error?: string },
      { id: string; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}/restore` : `/ceo/users/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'User', id: arg.id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    resetPin: build.mutation<
      { ok: boolean; error?: string },
      { id: string; password: string; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, password, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}/reset-pin` : `/ceo/users/${id}/reset-pin`,
        method: 'POST',
        body: { password },
      }),
    }),
```

- [ ] **Step 3: Checkpoint — typecheck**

Run: `npm run typecheck`
Expected: `users-manager.tsx` da `deactivateUser`/`restoreUser`/`resetPin` chaqiruvlari endi obyekt kutadi — keyingi taskda tuzatiladi. Bu bosqichda shu fayldagi xatolar kutiladi.

### Task F2: `UsersManager` — `scope`/`allowedRoles` proplari + "Qo'lda" smena

**Files:**
- Modify: `frontend/components/ceo/users-manager.tsx`

- [ ] **Step 1: `Props` ga `scope`/`allowedRoles` qo'shish**

`interface Props` (43-46) ni:

```ts
interface Props {
  stores: StoreOption[];
  currentUserId: string;
  scope?: 'ceo' | 'admin';
  allowedRoles?: Role[];
}
```

`UsersManager` signaturasini va mutatsiya chaqiruvlarini scope bilan yangilang:

```ts
export function UsersManager({
  stores,
  currentUserId,
  scope = 'ceo',
  allowedRoles = ['employee', 'manager', 'ceo'],
}: Props): React.ReactElement {
  const { data: users = [], isLoading } = useListUsersQuery({ includeDeleted: true, scope });
  const [restoreUser] = useRestoreUserMutation();
  ...
```

`restore()` funksiyasidagi chaqiruvni `restoreUser({ id: u.id, scope })` qiling.

- [ ] **Step 2: `UserFormModal` ga `scope`/`allowedRoles` uzatish va soat holatini qo'shish**

`UsersManager` ichidagi ikkala `<UserFormModal ...>` (create va edit) ga `scope={scope}` va `allowedRoles={allowedRoles}` proplarini qo'shing.

`UserFormModal` signaturasiga qo'shing:

```ts
  scope = 'ceo' as 'ceo' | 'admin',
  allowedRoles = ['employee', 'manager', 'ceo'] as Role[],
```

(props tipiga `scope?: 'ceo' | 'admin'; allowedRoles?: Role[];` qo'shing.)

State qo'shing (`defaultShiftType` yonida):

```ts
  const [defaultShiftStartTime, setDefaultShiftStartTime] = useState<string>(
    user?.defaultShiftStartTime ?? '09:00',
  );
  const [defaultShiftEndTime, setDefaultShiftEndTime] = useState<string>(
    user?.defaultShiftEndTime ?? '18:00',
  );
```

`submit()` ichidagi `base` obyektiga soatlarni qo'shing:

```ts
      defaultShiftType: role === 'ceo'
        ? null
        : ((defaultShiftType || null) as ApiUser['defaultShiftType']),
      defaultShiftStartTime:
        role !== 'ceo' && defaultShiftType === 'custom' ? defaultShiftStartTime : null,
      defaultShiftEndTime:
        role !== 'ceo' && defaultShiftType === 'custom' ? defaultShiftEndTime : null,
```

`submit()` ichida custom validatsiya (PIN tekshiruvidan keyin):

```ts
    if (role !== 'ceo' && defaultShiftType === 'custom') {
      if (defaultShiftStartTime >= defaultShiftEndTime) {
        toast.error("Boshlanish vaqti tugashdan oldin bo'lishi kerak");
        return;
      }
    }
```

Mutatsiya chaqiruvlarini scope bilan yangilang:

```ts
      if (mode === 'create') {
        await createUser({ ...base, password, scope }).unwrap();
      } else {
        await updateUser({ id: user!.id, body: base, scope }).unwrap();
      }
```

- [ ] **Step 3: Rol selectini `allowedRoles` bilan cheklash**

Rol `<NativeSelect>` (447-457) options'ini filtrlang:

```ts
              options={[
                { value: 'employee', label: 'Xodim' },
                { value: 'manager', label: 'Menejer' },
                { value: 'ceo', label: 'CEO' },
              ].filter((o) => allowedRoles.includes(o.value as Role))}
```

- [ ] **Step 4: Smena dropdownga "Qo'lda" + soat inputlari**

Smena `<Field>` blokini (483-503) quyidagiga almashtiring:

```tsx
        {role !== 'ceo' && (
          <>
            <Field
              label="Smena"
              hint="Doimiy smena — kech kelish/erta ketish shu ish vaqtiga nisbatan hisoblanadi. 'Qo'lda' tanlansa, soatni o'zingiz kiritasiz."
              optional
            >
              <NativeSelect
                value={defaultShiftType}
                onChange={setDefaultShiftType}
                options={[
                  { value: '', label: 'Smena tanlanmagan' },
                  ...(['morning', 'evening', 'flexible', 'day_off'] as ShiftType[]).map((s) => ({
                    value: s,
                    label: SHIFT_META[s].startTime
                      ? `${SHIFT_META[s].label} (${SHIFT_META[s].short})`
                      : SHIFT_META[s].label,
                  })),
                  { value: 'custom', label: "Qo'lda (soatni kiriting)" },
                ]}
              />
            </Field>
            {defaultShiftType === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Boshlanish" hint="HH:mm">
                  <Input
                    type="time"
                    value={defaultShiftStartTime}
                    onChange={(e) => setDefaultShiftStartTime(e.target.value)}
                    className="tabular"
                  />
                </Field>
                <Field label="Tugash" hint="HH:mm">
                  <Input
                    type="time"
                    value={defaultShiftEndTime}
                    onChange={(e) => setDefaultShiftEndTime(e.target.value)}
                    className="tabular"
                  />
                </Field>
              </div>
            )}
          </>
        )}
```

- [ ] **Step 5: Checkpoint — typecheck + lint**

Run: `npm run typecheck`
Expected: PASS.
Run: `npm run lint`
Expected: PASS (yangi importlar ishlatilgan, ishlatilmagan o'zgaruvchi yo'q).

### Task F3: Menejer "Xodimlar" sahifasini `UsersManager` ga o'tkazish

**Files:**
- Modify: `frontend/app/(dashboard)/admin/employees/page.tsx`

- [ ] **Step 1: Sahifani qayta yozish**

`frontend/app/(dashboard)/admin/employees/page.tsx` ni to'liq almashtiring:

```tsx
import { requireManagerSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { UsersManager, type StoreOption } from '@/components/ceo/users-manager';
import { ShiftTemplatesManager } from '@/components/ceo/shift-templates-manager';

export const dynamic = 'force-dynamic';

interface StoresResponse {
  ok: boolean;
  stores: Array<{ id: string; name: string }>;
}

export default async function EmployeesPage(): Promise<React.ReactElement> {
  const user = await requireManagerSession();
  const storesRes = await apiFetch<StoresResponse>('/api/admin/stores');
  const stores: StoreOption[] = (storesRes.stores ?? []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Xodimlar</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Xodim qo'shish, tahrirlash va smena soatlarini boshqarish
        </p>
      </div>

      <ShiftTemplatesManager />

      <UsersManager
        stores={stores}
        currentUserId={user.id}
        scope="admin"
        allowedRoles={['employee']}
      />
    </div>
  );
}
```

- [ ] **Step 2: Checkpoint — typecheck**

Run: `npm run typecheck`
Expected: PASS (`ShiftTemplatesManager` Task F4 da yaratiladi — agar F4 dan oldin bo'lsa, import xatosi bo'ladi; F4 ni avval bajaring yoki shu importni vaqtincha olib turing).

### Task F4: Smena shablonlari boshqaruvi (service + komponent)

**Files:**
- Create: `frontend/services/shiftsApi.ts`
- Create: `frontend/components/ceo/shift-templates-manager.tsx`

- [ ] **Step 1: `shiftsApi` yaratish**

`frontend/services/shiftsApi.ts`:

```ts
import { baseApi } from './baseApi';

export interface ShiftTemplate {
  label: string;
  startTime: string | null;
  endTime: string | null;
}
export type ShiftTemplates = Record<'morning' | 'evening' | 'flexible', ShiftTemplate>;

export const shiftsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getShiftsConfig: build.query<ShiftTemplates, void>({
      query: () => '/admin/shifts-config',
      transformResponse: (res: { ok: boolean; shifts: ShiftTemplates }) => res.shifts,
      providesTags: [{ type: 'ShiftConfig', id: 'GLOBAL' }],
    }),
    updateShiftsConfig: build.mutation<
      { ok: boolean; shifts: ShiftTemplates; error?: string },
      Partial<ShiftTemplates>
    >({
      query: (body) => ({ url: '/admin/shifts-config', method: 'PUT', body }),
      invalidatesTags: [{ type: 'ShiftConfig', id: 'GLOBAL' }],
    }),
  }),
});

export const { useGetShiftsConfigQuery, useUpdateShiftsConfigMutation } = shiftsApi;
```

> `baseApi` `tagTypes` ro'yxatiga `'ShiftConfig'` ni qo'shing (`frontend/services/baseApi.ts`). Agar `tagTypes` massivida yo'q bo'lsa, qo'shing: `tagTypes: [..., 'ShiftConfig']`.

- [ ] **Step 2: `ShiftTemplatesManager` komponentini yaratish**

`frontend/components/ceo/shift-templates-manager.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useGetShiftsConfigQuery,
  useUpdateShiftsConfigMutation,
  type ShiftTemplates,
} from '@/services/shiftsApi';

const ROWS: Array<{ key: keyof ShiftTemplates; title: string }> = [
  { key: 'morning', title: 'Ertalabki' },
  { key: 'evening', title: 'Kechki' },
  { key: 'flexible', title: "O'zgaruvchan" },
];

export function ShiftTemplatesManager(): React.ReactElement {
  const { data, isLoading } = useGetShiftsConfigQuery();
  const [save, { isLoading: saving }] = useUpdateShiftsConfigMutation();
  const [draft, setDraft] = useState<ShiftTemplates | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  async function submit() {
    if (!draft) return;
    // morning/evening — ikkala vaqt to'liq va start < end bo'lishi kerak.
    for (const key of ['morning', 'evening'] as const) {
      const t = draft[key];
      if (!t.startTime || !t.endTime) {
        toast.error(`${key === 'morning' ? 'Ertalabki' : 'Kechki'} smena vaqti to'liq emas`);
        return;
      }
      if (t.startTime >= t.endTime) {
        toast.error('Boshlanish vaqti tugashdan oldin bo\'lishi kerak');
        return;
      }
    }
    try {
      await save(draft).unwrap();
      toast.success('Smena soatlari saqlandi');
    } catch (err) {
      toast.error((err as { data?: { error?: string } })?.data?.error ?? 'Saqlanmadi');
    }
  }

  function setTime(key: keyof ShiftTemplates, field: 'startTime' | 'endTime', value: string) {
    setDraft((d) => (d ? { ...d, [key]: { ...d[key], [field]: value || null } } : d));
  }

  return (
    <Card className="p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="size-4 text-[color:var(--ink-2)]" />
        <h2 className="text-[14px] font-semibold">Smena soatlari</h2>
      </div>
      <p className="text-[12px] text-[color:var(--ink-3)] mb-4">
        Bu yerdagi o'zgarish shu smenaga biriktirilgan barcha xodimlarga ta'sir qiladi.
        O'zgaruvchan smenada vaqt majburiy emas.
      </p>

      {isLoading || !draft ? (
        <div className="py-8 text-center">
          <Loader2 className="size-5 mx-auto animate-spin text-[color:var(--ink-3)]" />
        </div>
      ) : (
        <div className="space-y-3">
          {ROWS.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
              <div className="text-[13px] font-medium">{row.title}</div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[color:var(--ink-3)]">Boshlanish</Label>
                <Input
                  type="time"
                  value={draft[row.key].startTime ?? ''}
                  onChange={(e) => setTime(row.key, 'startTime', e.target.value)}
                  className="tabular w-[130px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[color:var(--ink-3)]">Tugash</Label>
                <Input
                  type="time"
                  value={draft[row.key].endTime ?? ''}
                  onChange={(e) => setTime(row.key, 'endTime', e.target.value)}
                  className="tabular w-[130px]"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Saqlash
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Checkpoint — typecheck**

Run: `npm run typecheck`
Expected: PASS.

### Task F5: CEO sozlamalar sahifasiga smena kartasini qo'shish

**Files:**
- Modify: `frontend/app/(ceo)/ceo/settings/page.tsx`

- [ ] **Step 1: Import va sub-nav bandi**

`page.tsx` importlariga qo'shing:

```ts
import { ShiftTemplatesManager } from '@/components/ceo/shift-templates-manager';
import { Clock } from 'lucide-react';
```

(`Clock` allaqachon `lucide-react` dan import bo'lsa, takrorlamang.)

`SECTIONS` massiviga (jarima qoidalaridan keyin) qo'shing:

```ts
  { id: 'shifts', label: 'Smena soatlari', icon: Clock },
```

- [ ] **Step 2: Karta blokini joylashtirish**

`page.tsx` da "Penalty rules" `<Card>` dan keyin (192-qatordan keyin) qo'shing:

```tsx
          {/* Shift templates */}
          <Card id="shifts" className="p-6 scroll-mt-6">
            <SectionHead
              icon={<Clock className="size-4" />}
              tone="accent"
              title="Smena soatlari"
              subtitle="3 ta smena boshlanish/tugash vaqti — kech kelish shu asosda hisoblanadi"
            />
            <div className="mt-5">
              <ShiftTemplatesManager />
            </div>
          </Card>
```

> `ShiftTemplatesManager` o'zi `Card` ichida — ikki marta karta bo'lib ketmasligi uchun, xohlasangiz tashqi `<Card>` o'rniga to'g'ridan-to'g'ri `<ShiftTemplatesManager />` ni `id="shifts"` bilan o'rab qo'ying. Joriy SectionHead uslubini saqlash uchun yuqoridagi variant ham maqbul.

- [ ] **Step 3: Checkpoint — typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

## Phase G — Yakuniy tekshiruv

### Task G1: To'liq typecheck + backend testlar

- [ ] **Step 1: Ikkala tomon typecheck**

Run: `npm run typecheck`
Expected: PASS (backend + frontend).

- [ ] **Step 2: Barcha backend testlar**

Run: `cd backend && npx vitest run`
Expected: PASS — jumladan yangi: `app-settings.shifts`, `schedules.service`, `users.dto`, `users.service.shift`, `admin-users.permission`, va eski `attendances.service` (regressiya yo'q).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

### Task G2: Qo'lda dud test (manual smoke) — ixtiyoriy lekin tavsiya

- [ ] **Step 1: Dev muhitni ko'tarish**

Run: `npm run dev` (yoki `npm run db:up` keyin `npm run dev`).

- [ ] **Step 2: CEO sifatida tekshirish**
  - CEO (`998901234567`/`1234`) bilan kiring.
  - Sozlamalar → "Smena soatlari" → Ertalabki ni `09:00–19:00` ga o'zgartirib saqlang.
  - Jamoa → yangi xodim: smena = "Qo'lda", `10:00–20:00` kiriting, saqlang. Xatosiz saqlanishi kerak.
  - Yana bir xodim: smena = "Ertalabki" tanlang, saqlang.

- [ ] **Step 3: Menejer sifatida tekshirish**
  - Menejer (`998900000000`/`2222`) bilan kiring.
  - "Xodimlar" sahifasida "Smena soatlari" kartasi va "Yangi foydalanuvchi" tugmasi ko'rinishi kerak.
  - Yangi xodim qo'shing (rol tanlovida faqat "Xodim" bo'lishi kerak). Smena = "Qo'lda" bilan saqlang.
  - DevTools/Network: `POST /api/admin/users` 200 qaytishi kerak.

- [ ] **Step 4: Davomat mantig'ini tekshirish (ixtiyoriy)**
  - "Qo'lda" smenali xodim bilan kirib "Keldim" bossangiz, kech kelish o'sha kiritilgan boshlanish vaqtiga nisbatan hisoblanishini kuzating.

---

## Self-Review (reja muallifi tomonidan bajarildi)

- **Spec qamrovi:** (1) tahrirlanadigan smena soatlari — Phase B + F4/F5. (2) qo'lda soat — Phase A/C/D + F2. (3) menejer xodim qo'shishi (employee-only) — Phase E + F1/F3. Barcha spec bo'limlari qoplangan.
- **Tartib bog'liqligi:** C1 testi User soat maydonlariga tayanadi (D1) — eslatma qo'shildi; F3 `ShiftTemplatesManager` ga tayanadi (F4) — eslatma qo'shildi. Tavsiya: A → B → D → C → E → F (F4 ni F3 dan oldin) → G.
- **Tip mosligi:** `ShiftTemplates`/`ShiftTemplate` backend (`app-settings.service`) va frontend (`shiftsApi`) da bir xil shaklda; `serializeUser` yagona manbadan; `scope` parametri barcha mutatsiyalarda bir xil nomda.
- **Placeholder yo'q:** har bir qadamda to'liq kod berilgan.
- **Ehtiyot eslatmalar:** `Store.isActive` mavjudligini (E1) va `baseApi.tagTypes` ga `ShiftConfig` qo'shishni (F4) tekshirish kerakligi belgilangan.

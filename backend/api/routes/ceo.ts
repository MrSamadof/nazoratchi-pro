import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { Types } from 'mongoose';
import { connectDatabase } from '../../src/core/database/connection.js';
import { getCeoInsights } from '../../src/modules/reports/insights.service.js';
import { usersService, UsersError } from '../../src/modules/users/users.service.js';
import { createUserDto, updateUserDto, resetPinDto } from '../../src/modules/users/users.dto.js';
import { serializeUser } from '../../src/modules/users/users.serializer.js';
import { USER_ROLES, type UserRole } from '../../src/modules/users/users.model.js';
import { PenaltyRule } from '../../src/modules/penalties/penalties.model.js';
import {
  createPenaltyRuleDto,
  updatePenaltyRuleDto,
} from '../../src/modules/penalties/penalties.dto.js';
import { Store } from '../../src/modules/stores/stores.model.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { appSettingsService } from '../../src/modules/app-settings/app-settings.service.js';
import { notifyUser, getBotUsername } from '../../src/notifications/telegram.js';
import { billzService, BillzError } from '../../src/modules/billz/billz.service.js';
import { startOfTashkentDay } from '../../src/core/utils/date.js';
import { logger } from '../../src/core/logger/logger.js';
import { loadSession, requireCeo } from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';

export const ceoRouter = Router();
ceoRouter.use(loadSession, requireCeo);

ceoRouter.get('/insights', async (_req, res) => {
  await connectDatabase();
  const insights = await getCeoInsights();
  res.json({ ok: true, ...insights });
});

function serializePenaltyRule(r: typeof PenaltyRule.prototype) {
  return {
    id: r._id.toString(),
    name: r.name,
    type: r.type,
    minMinutes: r.minMinutes,
    maxMinutes: r.maxMinutes,
    amount: r.amount,
    isActive: r.isActive,
    notes: r.notes ?? '',
  };
}

// Sozlamalar sahifasi uchun jarima qoidalari roʻyxati
ceoRouter.get('/penalty-rules', async (_req, res) => {
  await connectDatabase();
  const rules = await PenaltyRule.find({}).sort({ type: 1, minMinutes: 1 });
  res.json({ ok: true, rules: rules.map(serializePenaltyRule) });
});

// Yangi jarima qoidasi
ceoRouter.post('/penalty-rules', async (req: Request, res: Response) => {
  try {
    const dto = createPenaltyRuleDto.parse(req.body);
    if (dto.maxMinutes !== null && dto.maxMinutes < dto.minMinutes) {
      res.status(400).json({ ok: false, error: "Yuqori chegara quyi chegaradan kichik bo'lolmaydi" });
      return;
    }
    await connectDatabase();
    const created = await PenaltyRule.create(dto);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'PenaltyRule',
      targetId: created._id,
      meta: { op: 'create', type: created.type, amount: created.amount },
    });
    res.status(201).json({ ok: true, rule: serializePenaltyRule(created) });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'penalty-rule create');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

// Jarima qoidasini yangilash
ceoRouter.patch('/penalty-rules/:id', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const dto = updatePenaltyRuleDto.parse(req.body);
    await connectDatabase();
    const current = await PenaltyRule.findById(id);
    if (!current) {
      res.status(404).json({ ok: false, error: 'Qoida topilmadi' });
      return;
    }
    const minM = dto.minMinutes ?? current.minMinutes;
    const maxM = dto.maxMinutes !== undefined ? dto.maxMinutes : current.maxMinutes;
    if (maxM !== null && maxM < minM) {
      res.status(400).json({ ok: false, error: "Yuqori chegara quyi chegaradan kichik bo'lolmaydi" });
      return;
    }
    const updated = await PenaltyRule.findByIdAndUpdate(id, dto, { new: true });
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'PenaltyRule',
      targetId: updated!._id,
      meta: { op: 'update', changes: dto },
    });
    res.json({ ok: true, rule: serializePenaltyRule(updated!) });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'penalty-rule update');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

// Jarima qoidasini o'chirish
ceoRouter.delete('/penalty-rules/:id', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const deleted = await PenaltyRule.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ ok: false, error: 'Qoida topilmadi' });
    return;
  }
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'admin.config_changed',
    targetType: 'PenaltyRule',
    targetId: deleted._id,
    meta: { op: 'delete', type: deleted.type },
  });
  res.json({ ok: true });
});

// Tashqi xizmatlar va do'konlar holati — Sozlamalar/Integratsiyalar uchun
ceoRouter.get('/system-status', async (_req, res) => {
  await connectDatabase();
  const [stores, billzActive, settings] = await Promise.all([
    Store.countDocuments({ isActive: true }),
    Store.countDocuments({ isActive: true, hasBillz: true, billzUuid: { $ne: null } }),
    appSettingsService.getMasked(),
  ]);
  res.json({
    ok: true,
    stores,
    billzActive,
    integrations: {
      billz: settings.billzConfigured,
      telegram: settings.telegramConfigured,
      gemini: settings.geminiConfigured,
      geminiModel: settings.geminiModel,
    },
  });
});

// ---- Integratsiya kalitlari (Gemini, Telegram) ----

/**
 * GET /api/ceo/integrations — niqoblangan sozlamalar (kalitlarning o'zi qaytmaydi).
 */
ceoRouter.get('/integrations', async (_req: Request, res: Response) => {
  await connectDatabase();
  const masked = await appSettingsService.getMasked();
  // Telegram username'ini (bog'lash havolasi uchun) aniqlashga harakat qilamiz.
  let telegramBotUsername = masked.telegramBotUsername;
  if (masked.telegramConfigured && !telegramBotUsername) {
    telegramBotUsername = await getBotUsername().catch(() => null);
  }
  res.json({ ok: true, integrations: { ...masked, telegramBotUsername } });
});

const updateIntegrationsDto = z.object({
  // undefined — o'zgartirilmaydi; '' — o'chiriladi.
  geminiApiKey: z.string().max(200).optional(),
  geminiModel: z.string().trim().max(80).optional(),
  telegramBotToken: z.string().max(200).optional(),
  billzSecretToken: z.string().max(500).optional(),
});

/**
 * PUT /api/ceo/integrations — kalitlarni yangilash (shifrlab saqlanadi).
 */
ceoRouter.put('/integrations', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const dto = updateIntegrationsDto.parse(req.body);
    const masked = await appSettingsService.update({
      ...dto,
      updatedBy: req.auth!.user._id,
    });
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'AppSettings',
      meta: {
        op: 'integrations',
        changed: Object.keys(dto),
        geminiConfigured: masked.geminiConfigured,
        telegramConfigured: masked.telegramConfigured,
        billzConfigured: masked.billzConfigured,
      },
    });
    res.json({ ok: true, integrations: masked });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
      return;
    }
    logger.error({ err }, 'integrations update');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

// ---- Billz integratsiyasi (test, do'konlar, qo'lda sinx) ----

function billzErrMessage(err: unknown): { status: number; message: string } {
  if (err instanceof BillzError) {
    if (err.code === 'not_configured') return { status: 400, message: 'Billz secret_token sozlanmagan' };
    if (err.code === 'auth_failed') return { status: 400, message: "secret_token noto'g'ri yoki eskirgan" };
    if (err.code === 'forbidden') return { status: 403, message: "Billz: bu metodga ruxsat yo'q (BILLZ UI'da rolni sozlang)" };
    return { status: 502, message: 'Billz API bilan bog\'lanishda xato' };
  }
  return { status: 500, message: 'Texnik xato' };
}

/**
 * GET /api/ceo/billz/test — ulanishni tekshiradi: kompaniya nomi + do'konlar ro'yxati.
 */
ceoRouter.get('/billz/test', async (_req: Request, res: Response) => {
  try {
    const info = await billzService.testConnection();
    res.json({ ok: true, ...info });
  } catch (err) {
    const { status, message } = billzErrMessage(err);
    if (status >= 500) logger.error({ err }, 'billz test');
    res.status(status).json({ ok: false, error: message });
  }
});

/**
 * POST /api/ceo/billz/sync — bugungi savdoni barcha Billz do'konlaridan qo'lda sinx.
 */
ceoRouter.post('/billz/sync', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const result = await billzService.syncAllStores(startOfTashkentDay());
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'AppSettings',
      meta: { op: 'billz_manual_sync', ...result },
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    const { status, message } = billzErrMessage(err);
    if (status >= 500) logger.error({ err }, 'billz manual sync');
    res.status(status).json({ ok: false, error: message });
  }
});

// ---- Foydalanuvchilarni boshqarish ----

const listQuery = z.object({
  role: z.enum(USER_ROLES).optional(),
  storeId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isApproved: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  includeDeleted: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  search: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

ceoRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const q = listQuery.parse(req.query);
    await connectDatabase();
    const result = await usersService.list(
      {
        role: q.role as UserRole | undefined,
        storeId: q.storeId,
        isActive: q.isActive,
        isApproved: q.isApproved,
        includeDeleted: q.includeDeleted,
        search: q.search,
      },
      q.page,
      q.limit,
    );
    res.json({
      ok: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      users: result.users.map(serializeUser),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'CEO users list');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

ceoRouter.get('/users/:id', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const user = await usersService.findById(id);
  if (!user) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  await user.populate('storeId', 'name slug');
  res.json({ ok: true, user: serializeUser(user) });
});

ceoRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const dto = createUserDto.parse(req.body);
    await connectDatabase();
    const created = await usersService.create(dto);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'User',
      targetId: created._id,
      meta: { op: 'create', role: created.role, phone: created.phone },
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
    logger.error({ err }, 'CEO user create');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

ceoRouter.patch('/users/:id', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const dto = updateUserDto.parse(req.body);
    const selfId = req.auth!.user._id.toString();
    // CEO o'zining rolini yoki aktivligini o'zgartira olmaydi (lockout xavfi)
    if (id === selfId) {
      if (dto.role !== undefined && dto.role !== 'ceo') {
        res
          .status(400)
          .json({ ok: false, error: "O'zingizning rolingizni o'zgartira olmaysiz" });
        return;
      }
      if (dto.isActive === false) {
        res
          .status(400)
          .json({ ok: false, error: "O'zingizni faolsizlantira olmaysiz" });
        return;
      }
    }
    await connectDatabase();
    const updated = await usersService.update(id, dto);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Topilmadi' });
      return;
    }
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'User',
      targetId: updated._id,
      meta: { op: 'update', changes: dto },
    });
    if (dto.isApproved === true && updated.telegramId) {
      await notifyUser(
        updated.telegramId,
        "🎉 *Hisobingiz tasdiqlandi!*\n\nEndi web ilovaga telefon va PIN bilan kira olasiz.",
      );
    }
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
    logger.error({ err }, 'CEO user update');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

ceoRouter.post('/users/:id/reset-pin', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const dto = resetPinDto.parse(req.body);
    await connectDatabase();
    const updated = await usersService.resetPin(id, dto.password);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Topilmadi' });
      return;
    }
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'User',
      targetId: updated._id,
      meta: { op: 'reset_pin' },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'CEO user reset pin');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

ceoRouter.delete('/users/:id', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  if (id === req.auth!.user._id.toString()) {
    res.status(400).json({ ok: false, error: "O'zingizni o'chira olmaysiz" });
    return;
  }
  await connectDatabase();
  const deleted = await usersService.deactivate(new Types.ObjectId(id));
  if (!deleted) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'user.deactivated',
    targetType: 'User',
    targetId: deleted._id,
    meta: { op: 'delete' },
  });
  res.json({ ok: true });
});

ceoRouter.post('/users/:id/restore', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const restored = await usersService.restore(new Types.ObjectId(id));
  if (!restored) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'admin.config_changed',
    targetType: 'User',
    targetId: restored._id,
    meta: { op: 'restore' },
  });
  res.json({ ok: true });
});

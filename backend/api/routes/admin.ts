import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { Types } from 'mongoose';
import { connectDatabase } from '../../src/core/database/connection.js';
import { reportsService } from '../../src/modules/reports/reports.service.js';
import { authService } from '../../src/modules/auth/auth.service.js';
import { usersService, UsersError } from '../../src/modules/users/users.service.js';
import { createUserDto, updateUserDto, resetPinDto } from '../../src/modules/users/users.dto.js';
import { serializeUser } from '../../src/modules/users/users.serializer.js';
import { approvalsService } from '../../src/modules/approvals/approvals.service.js';
import { aiService } from '../../src/modules/ai/ai.service.js';
import { User, USER_ROLES } from '../../src/modules/users/users.model.js';
import { Store } from '../../src/modules/stores/stores.model.js';
import { Approval, APPROVAL_TYPE_LABELS } from '../../src/modules/approvals/approvals.model.js';
import { AuditLog } from '../../src/modules/audit-logs/audit-logs.model.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { appSettingsService } from '../../src/modules/app-settings/app-settings.service.js';
import { SHIFT_TEMPLATE_KEYS } from '../../src/core/config/constants.js';
import { notifyUser } from '../../src/notifications/telegram.js';
import { loadSession, requireManager } from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';
import { startOfTashkentDay, addDays, formatDate } from '../../src/core/utils/date.js';

export const adminRouter = Router();
adminRouter.use(loadSession, requireManager);

/**
 * Manager faqat oʻz doʻkonidagi maʼlumotlarni koʻra oladi.
 * CEO uchun cheklov yoʻq (`null` qaytadi).
 */
function managerStoreScope(req: Request): Types.ObjectId | null {
  const u = req.auth!.user;
  if (u.role === 'ceo') return null;
  return u.storeId ?? null;
}

/** Menejer xodim CRUD ruxsatini tekshiradi. role faqat 'employee' (yoki o'zgartirilmagan). */
export function canManageAsEmployee(role: string | undefined): boolean {
  return role === undefined || role === 'employee';
}

adminRouter.get('/overview', async (req, res) => {
  await connectDatabase();
  const scope = managerStoreScope(req);
  const userFilter: Record<string, unknown> = {
    isApproved: false,
    isActive: true,
  };
  const approvalFilter: Record<string, unknown> = { status: 'pending' };
  if (scope) {
    userFilter.storeId = scope;
    approvalFilter.storeId = scope;
  }

  const [summary, pendingUsers, pendingApprovals, offSiteEvents] = await Promise.all([
    reportsService.todayAttendanceSummary(),
    User.countDocuments(userFilter),
    Approval.countDocuments(approvalFilter),
    reportsService.todayOffSiteEvents(scope),
  ]);
  res.json({
    ok: true,
    summary,
    pendingUsers,
    pendingApprovals,
    offSiteEvents: offSiteEvents.map((e) => ({
      attendanceId: e.attendanceId,
      userName: e.userName,
      storeName: e.storeName,
      type: e.type,
      at: e.at,
      distanceMeters: e.distanceMeters,
      source: e.source,
      note: e.note,
    })),
  });
});

adminRouter.get('/employees', async (req: Request, res: Response) => {
  await connectDatabase();
  const scope = managerStoreScope(req);
  const sp = new URLSearchParams(req.query as Record<string, string>);
  const filter: Record<string, unknown> = { isActive: true };

  // CEO istasa filterlay oladi, manager esa har doim oʻz doʻkoniga cheklangan
  if (scope) {
    filter.storeId = scope;
  } else if (sp.get('storeId')) {
    filter.storeId = sp.get('storeId');
  }

  if (sp.get('role')) filter.role = sp.get('role');
  if (sp.get('approved') === 'true') filter.isApproved = true;
  if (sp.get('approved') === 'false') filter.isApproved = false;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit = 20;

  const [total, list] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .populate('storeId', 'name')
      .sort({ lastName: 1, firstName: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    ok: true,
    total,
    page,
    limit,
    employees: list.map((u) => {
      const store = u.storeId as unknown as { _id: { toString(): string }; name: string } | null;
      return {
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        role: u.role,
        isApproved: u.isApproved,
        storeId: store?._id?.toString() ?? null,
        storeName: store?.name ?? null,
        telegramId: u.telegramId,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      };
    }),
  });
});

// Menejer/CEO — do'konlar ro'yxati (forma uchun; do'kon scope)
adminRouter.get('/stores', async (req: Request, res: Response) => {
  await connectDatabase();
  const scope = managerStoreScope(req);
  const filter: Record<string, unknown> = { isActive: true };
  if (scope) filter._id = scope;
  const stores = await Store.find(filter).select('name').sort({ name: 1 });
  res.json({ ok: true, stores: stores.map((s) => ({ id: s._id.toString(), name: s.name })) });
});

// Menejer/CEO — xodimlar ro'yxati (to'liq shakl). Menejer barcha do'kondagi
// xodimlarni ko'radi/tahrirlaydi (do'kon scope'i xodim boshqaruvida qo'llanmaydi).
adminRouter.get('/users', async (req: Request, res: Response) => {
  await connectDatabase();
  const includeDeleted = String(req.query.includeDeleted) === 'true';
  const filter: Record<string, unknown> = { role: 'employee' };
  if (!includeDeleted) filter.isActive = true;
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

// Helper: menejer/CEO faqat employee rolidagi foydalanuvchini boshqaradi.
// Do'kon scope'i qo'llanmaydi — menejer barcha do'kondagi xodimni tahrirlaydi.
async function loadManagedEmployee(_req: Request, res: Response, id: string) {
  const target = await usersService.findById(id);
  if (!target) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return null;
  }
  if (target.role !== 'employee') {
    res.status(403).json({ ok: false, error: 'Faqat xodimni boshqara olasiz' });
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
    // Rolni shu endpoint orqali o'zgartirib bo'lmaydi (faqat /role, CEO uchun).
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

adminRouter.post('/users/:id/approve', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const target = await usersService.findById(id);
  if (!target) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  // Manager faqat oʻz doʻkonidagi xodimni tasdiqlay oladi
  const scope = managerStoreScope(req);
  if (scope && target.storeId?.toString() !== scope.toString()) {
    res.status(403).json({ ok: false, error: "Bu xodim sizning doʻkoningizdan emas" });
    return;
  }

  const approved = await authService.approveUser(target._id, req.auth!.user._id);
  if (!approved) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'user.approved',
    targetType: 'User',
    targetId: approved._id,
  });
  await notifyUser(
    approved.telegramId,
    "🎉 *Hisobingiz tasdiqlandi!*\n\nEndi web ilovaga telefon va PIN bilan kira olasiz.",
  );
  res.json({ ok: true });
});

adminRouter.post('/users/:id/reject', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  if (id === req.auth!.user._id.toString()) {
    res.status(400).json({ ok: false, error: "Oʻzingizni rad eta olmaysiz" });
    return;
  }
  await connectDatabase();
  const target = await usersService.findById(id);
  if (!target) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  const scope = managerStoreScope(req);
  if (scope && target.storeId?.toString() !== scope.toString()) {
    res.status(403).json({ ok: false, error: "Bu xodim sizning doʻkoningizdan emas" });
    return;
  }

  const rejected = await authService.rejectUser(target._id, req.auth!.user._id);
  if (!rejected) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'user.deactivated',
    targetType: 'User',
    targetId: rejected._id,
  });
  await notifyUser(rejected.telegramId, "Hisobingiz rad etildi. Menejer bilan bog'laning.");
  res.json({ ok: true });
});

adminRouter.patch('/users/:id/role', async (req: Request, res: Response) => {
  if (req.auth!.user.role !== 'ceo') {
    res.status(403).json({ ok: false, error: "Rolni faqat CEO o'zgartira oladi" });
    return;
  }
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const { role } = z.object({ role: z.enum(USER_ROLES) }).parse(req.body);
    if (id === req.auth!.user._id.toString() && role !== 'ceo') {
      res
        .status(400)
        .json({ ok: false, error: "O'zingizning rolingizni o'zgartira olmaysiz" });
      return;
    }
    await connectDatabase();
    const target = await usersService.setRole(new Types.ObjectId(id), role);
    if (!target) {
      res.status(404).json({ ok: false, error: 'Topilmadi' });
      return;
    }
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'User',
      targetId: target._id,
      meta: { role },
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

adminRouter.get('/approvals', async (req, res) => {
  await connectDatabase();
  const scope = managerStoreScope(req);
  const filter: Record<string, unknown> = { status: 'pending' };
  if (scope) filter.storeId = scope;

  const list = await Approval.find(filter)
    .populate('userId', 'firstName lastName phone')
    .populate('storeId', 'name')
    .sort({ createdAt: -1 });
  res.json({
    ok: true,
    approvals: list.map((a) => {
      const user = a.userId as unknown as { firstName: string; lastName: string; phone: string } | null;
      const store = a.storeId as unknown as { name: string } | null;
      return {
        id: a._id.toString(),
        type: a.type,
        requestedDate: a.requestedDate,
        requestedTime: a.requestedTime,
        reason: a.reason,
        createdAt: a.createdAt,
        userName: user ? `${user.lastName} ${user.firstName}` : '—',
        userPhone: user?.phone ?? '',
        storeName: store?.name ?? '',
      };
    }),
  });
});

adminRouter.post('/approvals/:id/decision', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const { decision, comment } = z
      .object({ decision: z.enum(['approve', 'reject']), comment: z.string().trim().max(500).optional().default('') })
      .parse(req.body);

    await connectDatabase();
    const approval = await approvalsService.findById(new Types.ObjectId(id));
    if (!approval) {
      res.status(404).json({ ok: false, error: 'Topilmadi' });
      return;
    }
    const scope = managerStoreScope(req);
    if (scope && approval.storeId?.toString() !== scope.toString()) {
      res
        .status(403)
        .json({ ok: false, error: "Bu so‘rov sizning do‘koningizdan emas" });
      return;
    }

    const updated =
      decision === 'approve'
        ? await approvalsService.approve(approval._id, req.auth!.user._id, comment)
        : await approvalsService.reject(approval._id, req.auth!.user._id, comment);
    if (!updated) {
      res.status(409).json({ ok: false, error: 'Hal qilingan yoki topilmadi' });
      return;
    }
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: decision === 'approve' ? 'approval.approved' : 'approval.rejected',
      targetType: 'Approval',
      targetId: updated._id,
      meta: { comment },
    });
    const target = await User.findById(updated.userId);
    if (target?.telegramId) {
      const status = decision === 'approve' ? '✅ Tasdiqlandi' : '❌ Rad etildi';
      const typeLabel = APPROVAL_TYPE_LABELS[updated.type as keyof typeof APPROVAL_TYPE_LABELS];
      let msg = `${status}\n\n📋 ${typeLabel}\n📅 ${formatDate(updated.requestedDate)}`;
      if (updated.requestedTime) msg += ` (${updated.requestedTime})`;
      if (comment) msg += `\n💬 Admin izohi: ${comment}`;
      await notifyUser(target.telegramId, msg);
    }
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    throw err;
  }
});

adminRouter.get('/reports/sales', async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'daily';
  const to = startOfTashkentDay();
  let from = to;
  if (period === 'weekly') from = addDays(to, -6);
  else if (period === 'monthly') from = addDays(to, -29);

  await connectDatabase();
  const report = await reportsService.buildSalesReport(from, to);
  res.json({ ok: true, from, to, ...report });
});

adminRouter.post('/ai-analysis', async (req: Request, res: Response) => {
  if (!(await aiService.isEnabled())) {
    res.status(400).json({ ok: false, error: "AI sozlanmagan — CEO panelidan Gemini kalitini qo'shing" });
    return;
  }
  try {
    const { text, period } = z
      .object({ text: z.string().min(10).max(20_000), period: z.string().default('kunlik') })
      .parse(req.body);
    const analysis = await aiService.analyzeReport(text, period);
    if (!analysis) {
      res.status(502).json({ ok: false, error: 'AI javob bermadi' });
      return;
    }
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.report_generated',
      meta: { type: `ai-${period}` },
    });
    res.json({ ok: true, analysis });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    throw err;
  }
});

// Audit log — faqat CEO uchun (kross-kompaniya maxfiyligi)
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  if (req.auth!.user.role !== 'ceo') {
    res.status(403).json({ ok: false, error: 'Faqat CEO uchun' });
    return;
  }
  await connectDatabase();
  const action = req.query.action as string | undefined;
  const userId = req.query.userId as string | undefined;
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const limit = 50;

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (userId) filter.userId = userId;

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .populate('userId', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    ok: true,
    total,
    page,
    limit,
    logs: logs.map((l) => {
      const u = l.userId as unknown as
        | { _id: { toString(): string }; firstName: string; lastName: string }
        | null;
      return {
        id: l._id.toString(),
        userId: u?._id ? u._id.toString() : null,
        userName: u ? `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim() : null,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId?.toString() ?? null,
        meta: l.meta,
        success: l.success,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt,
      };
    }),
  });
});

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

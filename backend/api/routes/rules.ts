import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { companyRulesService } from '../../src/modules/company-rules/company-rules.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { notificationsService } from '../../src/modules/notifications/notifications.service.js';
import { User } from '../../src/modules/users/users.model.js';
import {
  loadSession,
  requireAuth,
  requireManager,
} from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';
import { logger } from '../../src/core/logger/logger.js';

export const rulesRouter = Router();
rulesRouter.use(loadSession);

const ruleDto = z.object({
  title: z.string().trim().min(2, "Sarlavha kamida 2 belgi").max(120),
  category: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Kategoriya: a-z, 0-9, _"),
  content: z.string().trim().min(3, "Matn juda qisqa").max(5000),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

const updateDto = ruleDto.partial();

// Hamma autentifikatsiyalangan foydalanuvchilarga ochiq (faqat aktiv)
rulesRouter.get('/', requireAuth, async (_req, res) => {
  await connectDatabase();
  const rules = await companyRulesService.findAll();
  res.json({
    ok: true,
    rules: rules.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      category: r.category,
      content: r.content,
      order: r.order,
    })),
  });
});

// Boshqaruv ro'yxati — manager va CEO ham faolsiz qoidalarni ko'radi
rulesRouter.get('/admin', requireManager, async (_req, res) => {
  await connectDatabase();
  const rules = await companyRulesService.findAllIncludingInactive();
  res.json({
    ok: true,
    rules: rules.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      category: r.category,
      content: r.content,
      order: r.order,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});

rulesRouter.post('/', requireManager, async (req: Request, res: Response) => {
  try {
    const dto = ruleDto.parse(req.body);
    await connectDatabase();
    const created = await companyRulesService.create(dto);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'CompanyRule',
      targetId: created._id,
      meta: { op: 'create', title: created.title, category: created.category },
    });

    // Yangi qoida — barcha faol, tasdiqlangan xodimlarga bildirishnoma.
    const recipients = await User.find({ isActive: true, isApproved: true }).select('_id').lean();
    await notificationsService.notifyMany(
      recipients.map((u) => u._id),
      {
        type: 'rule_published',
        title: 'Yangi qoida e\'lon qilindi',
        body: created.title,
        link: '/rules',
      },
    );

    res.json({ ok: true, id: created._id.toString() });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'rule create');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

rulesRouter.patch('/:id', requireManager, async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const dto = updateDto.parse(req.body);
    await connectDatabase();
    const updated = await companyRulesService.update(id, dto);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Topilmadi' });
      return;
    }
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'CompanyRule',
      targetId: updated._id,
      meta: { op: 'update', changes: dto },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'rule update');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

rulesRouter.delete('/:id', requireManager, async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const deleted = await companyRulesService.deactivate(id);
  if (!deleted) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'admin.config_changed',
    targetType: 'CompanyRule',
    targetId: deleted._id,
    meta: { op: 'delete', title: deleted.title },
  });
  res.json({ ok: true });
});

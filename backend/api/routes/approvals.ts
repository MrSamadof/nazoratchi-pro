import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { Approval, APPROVAL_TYPES, APPROVAL_TYPE_LABELS } from '../../src/modules/approvals/approvals.model.js';
import {
  approvalsService,
  ApprovalsError,
} from '../../src/modules/approvals/approvals.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { notifyCEOs } from '../../src/notifications/telegram.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { startOfTashkentDay, formatDate } from '../../src/core/utils/date.js';
import { logger } from '../../src/core/logger/logger.js';

export const approvalsRouter = Router();
approvalsRouter.use(loadSession);

const createDto = z.object({
  type: z.enum(APPROVAL_TYPES),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana formati noto'g'ri"),
  // Vaqt ixtiyoriy — bo'sh ('') yoki HH:mm. (Dam olish so'rovida vaqt yo'q.)
  // Regex bo'sh satrni ham qabul qiladi, aks holda `.default('')` regexga tushib
  // "Invalid" xatosi beradi (default qiymat ham inner schema bilan tekshiriladi).
  requestedTime: z
    .string()
    .regex(/^(([01]?\d|2[0-3]):[0-5]\d)?$/, "Vaqt formati noto'g'ri")
    .optional()
    .default(''),
  reason: z.string().trim().min(3).max(500, "Sabab juda uzun"),
});

approvalsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  await connectDatabase();
  const list = await Approval.find({ userId: req.auth!.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({
    ok: true,
    approvals: list.map((a) => ({
      id: a._id.toString(),
      type: a.type,
      requestedDate: a.requestedDate,
      requestedTime: a.requestedTime,
      reason: a.reason,
      status: a.status,
      adminComment: a.adminComment,
      decidedAt: a.decidedAt,
      createdAt: a.createdAt,
    })),
  });
});

approvalsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const sess = req.auth!;
  if (!sess.user.storeId) {
    res.status(400).json({ ok: false, error: "Do'kon tayinlanmagan" });
    return;
  }
  try {
    const dto = createDto.parse(req.body);
    await connectDatabase();
    const requestedDate = startOfTashkentDay(new Date(`${dto.requestedDate}T00:00:00Z`));
    const approval = await approvalsService.create({
      userId: sess.user._id,
      storeId: sess.user.storeId,
      type: dto.type,
      requestedDate,
      requestedTime: dto.requestedTime,
      reason: dto.reason,
    });
    await auditLogsService.log({
      userId: sess.user._id,
      action: 'approval.requested',
      targetType: 'Approval',
      targetId: approval._id,
      meta: { type: dto.type, date: dto.requestedDate },
    });
    const typeLabel = APPROVAL_TYPE_LABELS[dto.type];
    await notifyCEOs(
      "⏳ *Yangi ruxsat so'rovi*\n\n" +
        `👤 ${sess.user.lastName} ${sess.user.firstName}\n` +
        `📅 ${formatDate(requestedDate)} ${dto.requestedTime ? `(${dto.requestedTime})` : ''}\n` +
        `🏷 ${typeLabel}\n` +
        `📝 ${dto.reason}\n\n` +
        "_Boshqaruv panelida ko'rib chiqing._",
    );
    res.json({ ok: true, id: approval._id.toString() });
  } catch (err) {
    if (err instanceof ApprovalsError) {
      res.status(409).json({ ok: false, error: err.message, code: err.code });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'approval create');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

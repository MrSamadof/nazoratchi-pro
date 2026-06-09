import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { salesService } from '../../src/modules/sales/sales.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { logger } from '../../src/core/logger/logger.js';

export const salesRouter = Router();
salesRouter.use(loadSession);

const createDto = z.object({
  quantity: z.coerce.number().int().min(1).max(100_000),
  notes: z.string().trim().max(500).optional().default(''),
});

salesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  await connectDatabase();
  const sales = await salesService.getTodayByUser(req.auth!.user._id);
  res.json({
    ok: true,
    sales: sales.map((s) => ({
      id: s._id.toString(),
      quantity: s.quantity,
      amount: s.amount,
      notes: s.notes,
      source: s.source,
      createdAt: s.createdAt,
    })),
  });
});

salesRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const sess = req.auth!;
  if (!sess.user.storeId) {
    res.status(400).json({ ok: false, error: "Do'kon tayinlanmagan" });
    return;
  }
  try {
    const dto = createDto.parse(req.body);
    await connectDatabase();
    const sale = await salesService.create({
      userId: sess.user._id,
      storeId: sess.user.storeId,
      quantity: dto.quantity,
      notes: dto.notes,
      source: 'manual',
    });
    await auditLogsService.log({
      userId: sess.user._id,
      action: 'sale.created',
      targetType: 'Sale',
      targetId: sale._id,
      meta: { quantity: dto.quantity },
    });
    res.json({ ok: true, id: sale._id.toString() });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'sale create');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

salesRouter.get('/stats', requireAuth, async (req: Request, res: Response) => {
  const days = Math.min(90, Math.max(1, parseInt(String(req.query.days ?? '7'), 10)));
  await connectDatabase();
  const stats = await salesService.getUserStats(req.auth!.user._id, days);
  res.json({ ok: true, days, ...stats });
});

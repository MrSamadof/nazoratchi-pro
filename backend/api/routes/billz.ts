import { Router } from 'express';
import { connectDatabase } from '../../src/core/database/connection.js';
import { billzService } from '../../src/modules/billz/billz.service.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { startOfTashkentDay } from '../../src/core/utils/date.js';

export const billzRouter = Router();
billzRouter.use(loadSession);

billzRouter.get('/today', requireAuth, async (req, res) => {
  if (!req.auth!.user.storeId) {
    res.json({ ok: true, cached: null });
    return;
  }
  await connectDatabase();
  const cached = await billzService.getCachedForStore(req.auth!.user.storeId, startOfTashkentDay());
  res.json({
    ok: true,
    cached: cached
      ? {
          totalAmount: cached.totalAmount,
          itemCount: cached.itemCount,
          transactionCount: cached.transactionCount,
          fetchedAt: cached.fetchedAt,
        }
      : null,
  });
});

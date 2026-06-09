import { Router, type Request, type Response } from 'express';
import { connectDatabase } from '../../src/core/database/connection.js';
import { reportsService } from '../../src/modules/reports/reports.service.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { logger } from '../../src/core/logger/logger.js';

export const reportsRouter = Router();
reportsRouter.use(loadSession);

/**
 * Kunlik reyting — barcha rollar uchun ochiq.
 * Do'konlar aro + xodimlar aro (faqat dona soni; summa ko'rsatilmaydi).
 */
reportsRouter.get('/leaderboard', requireAuth, async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const board = await reportsService.dailyLeaderboard(req.auth!.user._id);
    res.json({
      ok: true,
      date: board.date,
      stores: board.stores,
      employeesByDivision: board.employeesByDivision,
      me: board.me,
    });
  } catch (err) {
    logger.error({ err }, 'leaderboard');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

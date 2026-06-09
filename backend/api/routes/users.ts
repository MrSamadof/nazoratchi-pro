import { Router, type Request, type Response } from 'express';
import { connectDatabase } from '../../src/core/database/connection.js';
import { User } from '../../src/modules/users/users.model.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { logger } from '../../src/core/logger/logger.js';

export const usersRouter = Router();
usersRouter.use(loadSession, requireAuth);

/**
 * GET /api/users — faol, tasdiqlangan xodimlarning minimal ro'yxati.
 * Rag'bat oluvchini tanlash kabi joylarda ishlatiladi (har bir kirgan foydalanuvchi uchun).
 */
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    await connectDatabase();
    const users = await User.find({ isActive: true, isApproved: true })
      .select('firstName lastName division storeId role')
      .populate('storeId', 'name')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    res.json({
      ok: true,
      users: users.map((u) => {
        const store = u.storeId as unknown as { name: string } | null;
        return {
          id: String(u._id),
          fullName: `${u.lastName ?? ''} ${u.firstName}`.trim(),
          storeName: store?.name ?? null,
          division: u.division ?? null,
          role: u.role,
        };
      }),
    });
  } catch (err) {
    logger.error({ err }, 'users list xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

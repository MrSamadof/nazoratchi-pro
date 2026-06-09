import { Router, type Request, type Response } from 'express';
import { connectDatabase } from '../../src/core/database/connection.js';
import { notificationsService } from '../../src/modules/notifications/notifications.service.js';
import type { NotificationDoc } from '../../src/modules/notifications/notifications.model.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';
import { logger } from '../../src/core/logger/logger.js';

export const notificationsRouter = Router();
notificationsRouter.use(loadSession, requireAuth);

function serialize(n: NotificationDoc) {
  return {
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

/** GET /api/notifications — so'nggi bildirishnomalar + o'qilmaganlar soni. */
notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const userId = req.auth!.user._id;
    const [list, unreadCount] = await Promise.all([
      notificationsService.listForUser(userId),
      notificationsService.unreadCount(userId),
    ]);
    res.json({ ok: true, notifications: list.map(serialize), unreadCount });
  } catch (err) {
    logger.error({ err }, 'notifications list xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** GET /api/notifications/unread-count — yengil (polling uchun). */
notificationsRouter.get('/unread-count', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const count = await notificationsService.unreadCount(req.auth!.user._id);
    res.json({ ok: true, count });
  } catch (err) {
    logger.error({ err }, 'unread-count xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** POST /api/notifications/:id/read */
notificationsRouter.post('/:id/read', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res, 'id');
  if (!id) return;
  try {
    await connectDatabase();
    await notificationsService.markRead(id, req.auth!.user._id);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'notification read xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** POST /api/notifications/read-all */
notificationsRouter.post('/read-all', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    await notificationsService.markAllRead(req.auth!.user._id);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'notification read-all xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

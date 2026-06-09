import { Router, type Request, type Response } from 'express';
import { connectDatabase } from '../../src/core/database/connection.js';
import {
  telegramLinkService,
  TelegramLinkError,
} from '../../src/modules/telegram/telegram-link.service.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { logger } from '../../src/core/logger/logger.js';

export const telegramRouter = Router();
telegramRouter.use(loadSession, requireAuth);

/**
 * GET /api/telegram/status — joriy foydalanuvchining Telegram bog'lanish holati.
 */
telegramRouter.get('/status', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const status = await telegramLinkService.getStatus(req.auth!.user._id);
    res.json({ ok: true, ...status });
  } catch (err) {
    logger.error({ err }, 'telegram status xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/**
 * POST /api/telegram/link — bir martalik bog'lash tokeni + deep-link yaratadi.
 */
telegramRouter.post('/link', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const result = await telegramLinkService.createLinkToken(req.auth!.user._id);
    res.json({
      ok: true,
      deepLink: result.deepLink,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof TelegramLinkError) {
      const code = err.code === 'BOT_DISABLED' ? 503 : 400;
      res.status(code).json({ ok: false, error: err.message, code: err.code });
      return;
    }
    logger.error({ err }, 'telegram link xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/**
 * POST /api/telegram/unlink — Telegram akkauntni uzadi.
 */
telegramRouter.post('/unlink', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    await telegramLinkService.unlink(req.auth!.user._id);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'telegram unlink xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

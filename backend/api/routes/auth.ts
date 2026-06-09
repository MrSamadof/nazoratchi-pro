import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { authService, AuthError } from '../../src/modules/auth/auth.service.js';
import { loginDto, registerDto } from '../../src/modules/auth/auth.dto.js';
import { storesService } from '../../src/modules/stores/stores.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { notifyCEOs } from '../../src/notifications/telegram.js';
import { env } from '../../src/core/config/env.js';
import { logger } from '../../src/core/logger/logger.js';
import { loadSession } from '../middleware/auth.js';

export const authRouter = Router();

const COOKIE_NAME = env.SESSION_COOKIE_NAME;

function maxAge(): number {
  const m = env.SESSION_EXPIRES_IN.match(/^(\d+)([dhm])$/);
  if (!m) return 7 * 86_400;
  const v = parseInt(m[1]!, 10);
  return m[2] === 'd' ? v * 86_400 : m[2] === 'h' ? v * 3600 : v * 60;
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAge() * 1000,
  });
}

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const dto = loginDto.parse(req.body);
    await connectDatabase();
    const userAgent = req.headers['user-agent'] ?? '';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.ip ??
      '';

    const { user, session } = await authService.login(dto, { userAgent, ipAddress });
    setSessionCookie(res, session.token);
    await auditLogsService.log({
      userId: user._id,
      action: 'user.login',
      meta: { ipAddress, userAgent },
    });

    res.json({
      ok: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
      return;
    }
    if (err instanceof AuthError) {
      await auditLogsService
        .log({ action: 'user.login_failed', success: false, errorMessage: err.code })
        .catch(() => null);
      res.status(401).json({ ok: false, error: err.message, code: err.code });
      return;
    }
    logger.error({ err }, 'Login xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const dto = registerDto.parse(req.body);
    await connectDatabase();
    const store = await storesService.findById(dto.storeId);
    if (!store) {
      res.status(400).json({ ok: false, error: "Tanlangan do'kon topilmadi" });
      return;
    }

    const user = await authService.register(dto);
    await auditLogsService.log({
      userId: user._id,
      action: 'user.register',
      targetType: 'User',
      targetId: user._id,
    });

    await notifyCEOs(
      "🔔 *Yangi ro'yxatdan o'tish*\n\n" +
        `👤 ${user.lastName} ${user.firstName}\n` +
        `📱 +${user.phone}\n` +
        `🏪 ${store.name}\n\n` +
        '_Boshqaruv panelida tasdiqlang._',
    );

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
      return;
    }
    if (err instanceof AuthError) {
      res.status(400).json({ ok: false, error: err.message, code: err.code });
      return;
    }
    logger.error({ err }, 'Register xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    await connectDatabase();
    const result = await authService.findActiveSessionByToken(token);
    await authService.logout(token);
    if (result) {
      await auditLogsService.log({ userId: result.user._id, action: 'user.logout' });
    }
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/session', loadSession, async (req: Request, res: Response) => {
  if (!req.auth) {
    res.json({ ok: false, user: null });
    return;
  }
  const { user } = req.auth;
  res.json({
    ok: true,
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      storeId: user.storeId?.toString() ?? null,
    },
  });
});

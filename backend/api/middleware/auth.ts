import type { Request, Response, NextFunction } from 'express';
import { env } from '../../src/core/config/env.js';
import { authService } from '../../src/modules/auth/auth.service.js';
import { connectDatabase } from '../../src/core/database/connection.js';
import type { UserDoc } from '../../src/modules/users/users.model.js';
import type { SessionDoc } from '../../src/modules/auth/auth.model.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { user: UserDoc; session: SessionDoc };
  }
}

const COOKIE_NAME = env.SESSION_COOKIE_NAME;

export async function loadSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    await connectDatabase();
    const result = await authService.findActiveSessionByToken(token);
    if (result) req.auth = result;
  } catch {
    /* ignore */
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ ok: false, error: 'Tizimga kirishingiz kerak' });
    return;
  }
  next();
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ ok: false, error: 'Tizimga kirishingiz kerak' });
    return;
  }
  if (req.auth.user.role !== 'manager' && req.auth.user.role !== 'ceo') {
    res.status(403).json({ ok: false, error: 'Faqat menejer va CEO uchun' });
    return;
  }
  next();
}

export function requireCeo(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ ok: false, error: 'Tizimga kirishingiz kerak' });
    return;
  }
  if (req.auth.user.role !== 'ceo') {
    res.status(403).json({ ok: false, error: 'Faqat CEO uchun' });
    return;
  }
  next();
}

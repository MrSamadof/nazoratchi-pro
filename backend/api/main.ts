/**
 * Express backend — Next.js dan alohida REST API.
 * Port 4000 da ishlaydi.
 *
 * Next.js (3000) `/api/*` so'rovlarini bu serverga rewrites qiladi,
 * shuning uchun browser uchun hammasi same-origin (CORS shart emas).
 * To'g'ridan-to'g'ri (Postman) chaqirilsa CORS fallback ham bor.
 *
 * Ishga tushirish: `npm run dev:backend` (root dan) yoki `npm run dev` (backend ichidan).
 */

import '../src/core/config/load-env.js';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDatabase } from '../src/core/database/connection.js';
import { env } from '../src/core/config/env.js';
import { logger } from '../src/core/logger/logger.js';

import { authRouter } from './routes/auth.js';
import { storesRouter } from './routes/stores.js';
import { attendanceRouter } from './routes/attendance.js';
import { salesRouter } from './routes/sales.js';
import { approvalsRouter } from './routes/approvals.js';
import { rulesRouter } from './routes/rules.js';
import { billzRouter } from './routes/billz.js';
import { adminRouter } from './routes/admin.js';
import { ceoRouter } from './routes/ceo.js';
import { schedulesRouter } from './routes/schedules.js';
import { rewardsRouter } from './routes/rewards.js';
import { usersRouter } from './routes/users.js';
import { notificationsRouter } from './routes/notifications.js';
import { tasksRouter } from './routes/tasks.js';
import { telegramRouter } from './routes/telegram.js';
import { reportsRouter } from './routes/reports.js';
import { suggestionsRouter } from './routes/suggestions.js';

const PORT = Number(process.env.API_PORT ?? 4000);

async function start(): Promise<void> {
  await connectDatabase();

  const app = express();

  app.use(
    cors({
      origin: (process.env.API_CORS_ORIGIN ?? 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug({ method: req.method, url: req.url }, 'request');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/stores', storesRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/rules', rulesRouter);
  app.use('/api/billz', billzRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ceo', ceoRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/rewards', rewardsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/telegram', telegramRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/suggestions', suggestionsRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'unhandled express error');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  });

  app.listen(PORT, () => {
    logger.info({ port: PORT, env: env.NODE_ENV }, 'Express API server ishga tushdi');
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'Express start xato');
  process.exit(1);
});

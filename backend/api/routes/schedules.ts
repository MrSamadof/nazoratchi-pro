import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { Types } from 'mongoose';
import { connectDatabase } from '../../src/core/database/connection.js';
import { schedulesService } from '../../src/modules/schedules/schedules.service.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import {
  setShiftDto,
  swapShiftDto,
  weekQueryDto,
} from '../../src/modules/schedules/schedules.dto.js';
import type { ScheduleDoc } from '../../src/modules/schedules/schedules.model.js';
import { loadSession, requireManager } from '../middleware/auth.js';
import { parseTashkentDay, formatApiDate } from '../../src/core/utils/date.js';
import { logger } from '../../src/core/logger/logger.js';

export const schedulesRouter = Router();
schedulesRouter.use(loadSession, requireManager);

function serializeSchedule(s: ScheduleDoc) {
  return {
    id: s._id.toString(),
    userId: s.userId.toString(),
    storeId: s.storeId.toString(),
    date: formatApiDate(s.date),
    shiftType: s.shiftType,
    startTime: s.startTime,
    endTime: s.endTime,
    source: s.source,
    note: s.note,
  };
}

function zodError(res: Response, err: ZodError): void {
  res.status(400).json({ ok: false, error: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
}

/**
 * GET /api/schedules/week?storeId=&weekStart=yyyy-MM-dd
 * Do'konning bir haftalik jadvali + xodimlar ro'yxati (grid qatorlari uchun).
 */
schedulesRouter.get('/week', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const q = weekQueryDto.parse({
      storeId: req.query.storeId,
      weekStart: req.query.weekStart,
    });
    const weekStart = parseTashkentDay(q.weekStart);
    const [schedules, employees] = await Promise.all([
      schedulesService.getWeek(q.storeId, weekStart),
      usersService.findByStore(new Types.ObjectId(q.storeId)),
    ]);

    res.json({
      ok: true,
      weekStart: q.weekStart,
      employees: employees.map((u) => ({
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        division: u.division ?? null,
        role: u.role,
      })),
      schedules: schedules.map(serializeSchedule),
    });
  } catch (err) {
    if (err instanceof ZodError) return zodError(res, err);
    logger.error({ err }, 'schedules/week xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/**
 * POST /api/schedules/shift — bir xodimning bir kunlik smenasini belgilash.
 */
schedulesRouter.post('/shift', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const dto = setShiftDto.parse(req.body);
    const sched = await schedulesService.setShift({
      userId: dto.userId,
      storeId: dto.storeId,
      date: parseTashkentDay(dto.date),
      shiftType: dto.shiftType,
      source: 'scheduled',
      note: dto.note ?? '',
      assignedBy: req.auth!.user._id,
    });
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'Schedule',
      targetId: sched._id,
      meta: { date: dto.date, shiftType: dto.shiftType },
    });
    res.json({ ok: true, schedule: serializeSchedule(sched) });
  } catch (err) {
    if (err instanceof ZodError) return zodError(res, err);
    logger.error({ err }, 'schedules/shift xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/**
 * POST /api/schedules/swap — ikki xodimning o'sha kungi smenasini almashtirish.
 */
schedulesRouter.post('/swap', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const dto = swapShiftDto.parse(req.body);
    const { a, b } = await schedulesService.swap(
      dto.userA,
      dto.userB,
      parseTashkentDay(dto.date),
      req.auth!.user._id,
    );
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'Schedule',
      meta: { date: dto.date, swap: [dto.userA, dto.userB] },
    });
    res.json({ ok: true, schedules: [serializeSchedule(a), serializeSchedule(b)] });
  } catch (err) {
    if (err instanceof ZodError) return zodError(res, err);
    logger.error({ err }, 'schedules/swap xato');
    res.status(400).json({ ok: false, error: (err as Error).message ?? 'Texnik xato' });
  }
});

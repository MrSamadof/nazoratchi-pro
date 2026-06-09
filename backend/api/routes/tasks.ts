import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { tasksService, TasksError } from '../../src/modules/tasks/tasks.service.js';
import { notificationsService } from '../../src/modules/notifications/notifications.service.js';
import { User } from '../../src/modules/users/users.model.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import {
  createTaskDto,
  updateStatusDto,
  requestExtensionDto,
  decideExtensionDto,
} from '../../src/modules/tasks/tasks.dto.js';
import type { TaskDoc } from '../../src/modules/tasks/tasks.model.js';
import { loadSession, requireAuth, requireManager } from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';
import { logger } from '../../src/core/logger/logger.js';

export const tasksRouter = Router();
tasksRouter.use(loadSession, requireAuth);

function refName(ref: unknown): string | null {
  const r = ref as { firstName?: string; lastName?: string } | null;
  if (!r || typeof r !== 'object') return null;
  if (r.firstName || r.lastName) return `${r.lastName ?? ''} ${r.firstName ?? ''}`.trim();
  return null;
}

function serializeTask(t: TaskDoc) {
  const now = Date.now();
  const overdue =
    !!t.deadline &&
    t.deadline.getTime() < now &&
    t.status !== 'done' &&
    t.status !== 'cancelled';
  return {
    id: t._id.toString(),
    title: t.title,
    description: t.description,
    createdByName: refName(t.createdBy),
    assigneeType: t.assigneeType,
    targetDivision: t.targetDivision ?? null,
    assignees: (t.assignees as unknown[]).map((a) => ({
      id: (a as { _id: { toString(): string } })._id?.toString?.() ?? String(a),
      name: refName(a),
    })),
    startAt: t.startAt,
    deadline: t.deadline,
    status: t.status,
    priority: t.priority,
    overdue,
    completedAt: t.completedAt,
    extensions: (t.extensions as unknown[]).map((e) => {
      const ext = e as {
        _id: { toString(): string };
        requestedBy: unknown;
        requestedDeadline: Date;
        reason: string;
        status: string;
        comment: string;
        decidedAt: Date | null;
      };
      return {
        id: ext._id.toString(),
        requestedByName: refName(ext.requestedBy),
        requestedDeadline: ext.requestedDeadline,
        reason: ext.reason,
        status: ext.status,
        comment: ext.comment,
        decidedAt: ext.decidedAt,
      };
    }),
    createdAt: t.createdAt,
  };
}

function zodErr(res: Response, err: ZodError): void {
  res.status(400).json({ ok: false, error: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
}

function isManager(req: Request): boolean {
  const role = req.auth!.user.role;
  return role === 'manager' || role === 'ceo';
}

/** GET /api/tasks — rahbar/CEO hammasini, xodim o'ziga tegishlini ko'radi. */
tasksRouter.get('/', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const list = isManager(req)
      ? await tasksService.listAll()
      : await tasksService.listForUser(req.auth!.user._id);
    res.json({ ok: true, tasks: list.map(serializeTask) });
  } catch (err) {
    logger.error({ err }, 'tasks list xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** GET /api/tasks/mine — joriy foydalanuvchining topshiriqlari. */
tasksRouter.get('/mine', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const list = await tasksService.listForUser(req.auth!.user._id);
    res.json({ ok: true, tasks: list.map(serializeTask) });
  } catch (err) {
    logger.error({ err }, 'tasks/mine xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** POST /api/tasks — topshiriq yaratish (manager/CEO). */
tasksRouter.post('/', requireManager, async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const dto = createTaskDto.parse(req.body);
    const task = await tasksService.create({
      title: dto.title,
      description: dto.description,
      assigneeType: dto.assigneeType,
      assignees: dto.assignees,
      targetDivision: dto.targetDivision ?? null,
      targetStoreId: dto.targetStoreId ?? null,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      deadline: new Date(dto.deadline),
      priority: dto.priority,
      createdBy: req.auth!.user._id,
    });

    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'Task',
      targetId: task._id,
      meta: { title: task.title, assignees: task.assignees.length },
    });

    // Bajaruvchilarga bildirishnoma.
    await notificationsService.notifyMany(
      (task.assignees as unknown[]).map((a) => String(a)),
      {
      type: 'task_assigned',
      title: 'Yangi topshiriq',
      body: task.title,
      link: '/tasks',
      meta: { taskId: task._id.toString() },
    });

    res.status(201).json({ ok: true, task: serializeTask(task) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    if (err instanceof TasksError) return void res.status(400).json({ ok: false, error: err.message });
    logger.error({ err }, 'tasks create xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** PATCH /api/tasks/:id/status — status o'zgartirish (bajaruvchi/rahbar). */
tasksRouter.patch('/:id/status', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res, 'id');
  if (!id) return;
  try {
    await connectDatabase();
    const dto = updateStatusDto.parse(req.body);
    const task = await tasksService.updateStatus(id, req.auth!.user._id, dto.status, isManager(req));
    res.json({ ok: true, task: serializeTask(task) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    if (err instanceof TasksError) {
      const code = err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 400;
      return void res.status(code).json({ ok: false, error: err.message });
    }
    logger.error({ err }, 'task status xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** POST /api/tasks/:id/extension — muddat surish so'rovi. */
tasksRouter.post('/:id/extension', async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res, 'id');
  if (!id) return;
  try {
    await connectDatabase();
    const dto = requestExtensionDto.parse(req.body);
    const me = req.auth!.user;
    const task = await tasksService.requestExtension(
      id,
      me._id,
      new Date(dto.requestedDeadline),
      dto.reason,
    );

    // CEO va menejerlarga xabar — kim hal qilishi kerak.
    const approvers = await User.find({
      isActive: true,
      role: { $in: ['manager', 'ceo'] },
    }).select('_id');
    await notificationsService.notifyMany(
      approvers.map((u) => u._id),
      {
        type: 'task_extension_requested',
        title: 'Muddat surish so\'rovi',
        body: `${me.lastName} ${me.firstName}: «${task.title}»`,
        link: '/tasks',
        meta: { taskId: task._id.toString() },
      },
    );

    res.json({ ok: true, task: serializeTask(task) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    if (err instanceof TasksError) {
      const code = err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 400;
      return void res.status(code).json({ ok: false, error: err.message });
    }
    logger.error({ err }, 'task extension xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** POST /api/tasks/:id/extension/:extId/decide — muddat so'rovini hal qilish (manager/CEO). */
tasksRouter.post('/:id/extension/:extId/decide', requireManager, async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res, 'id');
  if (!id) return;
  const extId = typeof req.params.extId === 'string' ? req.params.extId : '';
  if (!extId) return void res.status(400).json({ ok: false, error: "Noto'g'ri so'rov" });
  try {
    await connectDatabase();
    const dto = decideExtensionDto.parse(req.body);
    const task = await tasksService.decideExtension(
      id,
      extId,
      req.auth!.user._id,
      dto.decision,
      dto.comment,
    );

    // So'rovchiga xabar.
    const ext = (task.extensions as unknown[]).find(
      (e) => (e as { _id: { toString(): string } })._id.toString() === extId,
    ) as { requestedBy: { toString(): string } } | undefined;
    if (ext?.requestedBy) {
      await notificationsService.notify(ext.requestedBy.toString(), {
        type: 'task_extension_decided',
        title: dto.decision === 'approve' ? 'Muddat surildi' : 'Muddat surish rad etildi',
        body: task.title,
        link: '/tasks',
      });
    }

    res.json({ ok: true, task: serializeTask(task) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    if (err instanceof TasksError) {
      const code = err.code === 'NOT_FOUND' || err.code === 'EXT_NOT_FOUND' ? 404 : 400;
      return void res.status(code).json({ ok: false, error: err.message });
    }
    logger.error({ err }, 'task extension decide xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

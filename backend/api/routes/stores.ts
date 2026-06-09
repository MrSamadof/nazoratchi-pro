import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { storesService } from '../../src/modules/stores/stores.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { loadSession, requireCeo } from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';
import { logger } from '../../src/core/logger/logger.js';

export const storesRouter = Router();

const storeDto = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  kind: z.enum(['store', 'office']).default('store'),
  hasBillz: z.boolean().default(false),
  billzUuid: z.string().optional().nullable(),
  workStartTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).default('09:00'),
  workEndTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).default('18:00'),
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),
  geofenceRadiusMeters: z.coerce.number().int().min(10).max(5000).default(100),
  weeklyTarget: z.coerce.number().min(0).default(0),
  monthlyTarget: z.coerce.number().min(0).default(0),
});

const updateDto = storeDto.partial();

// Public — register form uses this
storesRouter.get('/', async (_req, res) => {
  await connectDatabase();
  const stores = await storesService.findAll();
  res.json({
    stores: stores.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      kind: s.kind ?? 'store',
    })),
  });
});

// CEO-only: full list with targets
storesRouter.get('/full', loadSession, requireCeo, async (_req, res) => {
  await connectDatabase();
  const stores = await storesService.findAll();
  res.json({
    ok: true,
    stores: stores.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      kind: s.kind ?? 'store',
      hasBillz: s.hasBillz,
      billzUuid: s.billzUuid,
      workStartTime: s.workStartTime,
      workEndTime: s.workEndTime,
      address: s.address,
      phone: s.phone,
      location:
        s.location && typeof s.location.lat === 'number' && typeof s.location.lng === 'number'
          ? { lat: s.location.lat, lng: s.location.lng }
          : null,
      geofenceRadiusMeters: s.geofenceRadiusMeters ?? 100,
      weeklyTarget: s.weeklyTarget,
      monthlyTarget: s.monthlyTarget,
    })),
  });
});

storesRouter.post('/', loadSession, requireCeo, async (req: Request, res: Response) => {
  try {
    const dto = storeDto.parse(req.body);
    await connectDatabase();
    const existing = await storesService.findBySlug(dto.slug);
    if (existing) {
      res.status(400).json({ ok: false, error: 'Bu slug allaqachon ishlatilgan' });
      return;
    }
    const created = await storesService.create(dto);
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'Store',
      targetId: created._id,
      meta: { op: 'create', name: created.name },
    });
    res.json({ ok: true, id: created._id.toString() });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'Store create');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

storesRouter.patch('/:id', loadSession, requireCeo, async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  try {
    const dto = updateDto.parse(req.body);
    await connectDatabase();
    const updated = await storesService.update(id, dto);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Topilmadi' });
      return;
    }
    await auditLogsService.log({
      userId: req.auth!.user._id,
      action: 'admin.config_changed',
      targetType: 'Store',
      targetId: updated._id,
      meta: { op: 'update', changes: dto },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: err.errors[0]?.message });
      return;
    }
    logger.error({ err }, 'Store update');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

storesRouter.delete('/:id', loadSession, requireCeo, async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res);
  if (!id) return;
  await connectDatabase();
  const result = await storesService.deactivate(id);
  if (!result) {
    res.status(404).json({ ok: false, error: 'Topilmadi' });
    return;
  }
  await auditLogsService.log({
    userId: req.auth!.user._id,
    action: 'admin.config_changed',
    targetType: 'Store',
    targetId: result._id,
    meta: { op: 'delete', name: result.name },
  });
  res.json({ ok: true });
});

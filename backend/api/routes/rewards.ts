import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { rewardsService, RewardsError } from '../../src/modules/rewards/rewards.service.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { createRewardDto, decideRewardDto } from '../../src/modules/rewards/rewards.dto.js';
import type { RewardDoc } from '../../src/modules/rewards/rewards.model.js';
import { notifyUser, notifyManagers, notifyCEOs } from '../../src/notifications/telegram.js';
import { loadSession, requireAuth, requireManager } from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';
import { formatMoney } from '../../src/core/utils/format.js';
import { logger } from '../../src/core/logger/logger.js';

export const rewardsRouter = Router();
rewardsRouter.use(loadSession, requireAuth);

interface PopRef {
  _id: { toString(): string };
  firstName?: string;
  lastName?: string;
  name?: string;
}

function refName(ref: unknown): string | null {
  const r = ref as PopRef | null;
  if (!r || typeof r !== 'object') return null;
  if (r.name) return r.name;
  if (r.firstName || r.lastName) return `${r.lastName ?? ''} ${r.firstName ?? ''}`.trim();
  return null;
}

function serializeReward(r: RewardDoc) {
  return {
    id: r._id.toString(),
    recipientName: refName(r.userId),
    storeName: refName(r.storeId),
    requestedByName: refName(r.requestedBy),
    division: r.division ?? null,
    amount: r.amount,
    reason: r.reason,
    type: r.type,
    status: r.status,
    initiatorRole: r.initiatorRole,
    adminComment: r.adminComment,
    date: r.date,
    decidedAt: r.decidedAt,
    createdAt: r.createdAt,
  };
}

function zodErr(res: Response, err: ZodError): void {
  res.status(400).json({ ok: false, error: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
}

/**
 * POST /api/rewards — rag'bat so'rovi (xodim) yoki berish (rahbar).
 * CEO yaratsa darhol tasdiqlanadi.
 */
rewardsRouter.post('/', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const dto = createRewardDto.parse(req.body);
    const me = req.auth!.user;
    const isEmployee = me.role === 'employee';
    const initiatorRole = isEmployee ? 'employee' : 'manager';

    // Xodim boshqa xodimga rag'bat so'raydi (o'ziga emas) — miqdorni tasdiqlovchi belgilaydi.
    // Rahbar/CEO esa oluvchi va miqdorni ko'rsatishi shart.
    const recipientId = dto.recipientId;
    const amount = isEmployee ? 0 : dto.amount;
    if (!recipientId) {
      return void res.status(400).json({ ok: false, error: "Rag'bat oluvchini tanlang" });
    }
    if (isEmployee && String(recipientId) === String(me._id)) {
      return void res
        .status(400)
        .json({ ok: false, error: "O'zingizga rag'bat so'ray olmaysiz" });
    }
    if (!isEmployee && amount === undefined) {
      return void res.status(400).json({ ok: false, error: "Summani ko'rsating" });
    }

    let reward = await rewardsService.request({
      recipientId: recipientId!,
      amount: amount ?? 0,
      reason: dto.reason,
      requestedBy: me._id,
      initiatorRole,
    });

    // CEO bergan rag'bat — tasdiq talab qilmaydi.
    if (me.role === 'ceo') {
      reward = await rewardsService.approve(reward._id, me._id, 'CEO tomonidan berildi');
    }

    await auditLogsService.log({
      userId: me._id,
      action: 'admin.config_changed',
      targetType: 'Reward',
      targetId: reward._id,
      meta: { amount: amount ?? 0, recipient: recipientId?.toString(), status: reward.status },
    });

    // Bildirishnoma: kim tasdiqlashi kerak bo'lsa o'shaga.
    if (reward.status === 'pending') {
      const recipient = await usersService.findById(recipientId!);
      const recipientName = recipient ? `${recipient.lastName} ${recipient.firstName}`.trim() : '—';
      const amountLine = isEmployee
        ? "💰 Miqdor: tasdiqlashda belgilanadi\n"
        : `💰 ${formatMoney(amount ?? 0)} so'm\n`;
      const text =
        "🎁 *Yangi rag'bat so'rovi*\n\n" +
        `👤 Oluvchi: ${recipientName}\n` +
        amountLine +
        `📝 ${dto.reason}\n` +
        `👨‍💼 So'rovchi: ${me.lastName} ${me.firstName}`;
      if (initiatorRole === 'employee') await notifyManagers(text);
      else await notifyCEOs(text);
    }

    res.status(201).json({ ok: true, reward: serializeReward(reward) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    if (err instanceof RewardsError) {
      return void res.status(400).json({ ok: false, error: err.message });
    }
    logger.error({ err }, 'rewards POST xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** GET /api/rewards/mine — joriy foydalanuvchining rag'batlari. */
rewardsRouter.get('/mine', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const list = await rewardsService.getForUser(req.auth!.user._id);
    res.json({ ok: true, rewards: list.map(serializeReward) });
  } catch (err) {
    logger.error({ err }, 'rewards/mine xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** GET /api/rewards?status=pending — admin/CEO ro'yxati. */
rewardsRouter.get('/', requireManager, async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const list = await rewardsService.list({ status, limit: 200 });
    res.json({ ok: true, rewards: list.map(serializeReward) });
  } catch (err) {
    logger.error({ err }, 'rewards GET xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** POST /api/rewards/:id/decide — tasdiq/rad (tasdiq zanjiri bilan). */
rewardsRouter.post('/:id/decide', requireManager, async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res, 'id');
  if (!id) return;
  try {
    await connectDatabase();
    const dto = decideRewardDto.parse(req.body);
    const me = req.auth!.user;

    const reward = await rewardsService.findById(id);
    if (!reward) return void res.status(404).json({ ok: false, error: 'Rag\'bat topilmadi' });

    // Tasdiq zanjiri: rahbar bergan rag'batni faqat CEO tasdiqlaydi.
    if (reward.initiatorRole === 'manager' && me.role !== 'ceo') {
      return void res
        .status(403)
        .json({ ok: false, error: 'Rahbar bergan rag\'batni faqat CEO tasdiqlaydi' });
    }

    // Xodim o'ziga miqdorsiz so'ragan bo'lsa — tasdiqlovchi miqdorni belgilashi shart.
    if (dto.decision === 'approve' && reward.amount <= 0 && dto.amount === undefined) {
      return void res
        .status(400)
        .json({ ok: false, error: "Tasdiqlash uchun rag'bat summasini kiriting" });
    }

    const updated =
      dto.decision === 'approve'
        ? await rewardsService.approve(id, me._id, dto.comment, dto.amount)
        : await rewardsService.reject(id, me._id, dto.comment);

    await auditLogsService.log({
      userId: me._id,
      action: 'admin.config_changed',
      targetType: 'Reward',
      targetId: updated._id,
      meta: { decision: dto.decision },
    });

    // Oluvchiga xabar.
    const recipient = updated.userId ? await usersService.findById(updated.userId) : null;
    if (recipient?.telegramId) {
      const head = dto.decision === 'approve' ? '✅ Rag\'bat tasdiqlandi' : '❌ Rag\'bat rad etildi';
      let msg = `${head}\n\n💰 ${formatMoney(updated.amount)} so'm\n📝 ${updated.reason}`;
      if (dto.comment) msg += `\n💬 ${dto.comment}`;
      await notifyUser(recipient.telegramId, msg);
    }

    res.json({ ok: true, reward: serializeReward(updated) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    if (err instanceof RewardsError) {
      return void res.status(400).json({ ok: false, error: err.message });
    }
    logger.error({ err }, 'rewards decide xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

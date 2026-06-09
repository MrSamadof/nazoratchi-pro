import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { suggestionsService, SuggestionsError } from '../../src/modules/suggestions/suggestions.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import {
  createSuggestionDto,
  decideSuggestionDto,
} from '../../src/modules/suggestions/suggestions.dto.js';
import type { SuggestionDoc, SuggestionStatus } from '../../src/modules/suggestions/suggestions.model.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { notifyUser, notifyCEOs } from '../../src/notifications/telegram.js';
import { loadSession, requireAuth, requireCeo } from '../middleware/auth.js';
import { getObjectIdParam } from '../middleware/params.js';
import { logger } from '../../src/core/logger/logger.js';

export const suggestionsRouter = Router();
suggestionsRouter.use(loadSession, requireAuth);

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

const STATUS_LABELS: Record<SuggestionStatus, string> = {
  new: 'Yangi',
  reviewing: "Ko'rib chiqilmoqda",
  accepted: 'Qabul qilindi',
  rejected: 'Rad etildi',
};

/**
 * @param forOwner true bo'lsa muallifning o'z ro'yxati — anonim bo'lsa ham ism ko'rinadi.
 *                 CEO ro'yxatida anonim taklif muallifi yashiriladi.
 */
function serializeSuggestion(s: SuggestionDoc, forOwner: boolean) {
  const showAuthor = forOwner || !s.isAnonymous;
  return {
    id: s._id.toString(),
    title: s.title ?? '',
    text: s.text,
    isAnonymous: s.isAnonymous,
    authorName: showAuthor ? refName(s.userId) : null,
    storeName: showAuthor ? refName(s.storeId) : null,
    division: showAuthor ? (s.division ?? null) : null,
    status: s.status,
    ceoResponse: s.ceoResponse ?? '',
    decidedAt: s.decidedAt,
    createdAt: s.createdAt,
  };
}

function zodErr(res: Response, err: ZodError): void {
  res.status(400).json({ ok: false, error: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
}

/** POST /api/suggestions — xodim taklif yuboradi (to'g'ridan-to'g'ri CEO ga). */
suggestionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const dto = createSuggestionDto.parse(req.body);
    const me = req.auth!.user;

    const suggestion = await suggestionsService.create({
      userId: me._id,
      storeId: me.storeId ?? null,
      division: me.division ?? null,
      title: dto.title,
      text: dto.text,
      isAnonymous: dto.isAnonymous,
    });

    await auditLogsService.log({
      userId: me._id,
      action: 'suggestion.created',
      targetType: 'Suggestion',
      targetId: suggestion._id,
      meta: { isAnonymous: dto.isAnonymous },
    });

    // CEO ga bildirishnoma — anonim bo'lsa ism ko'rsatilmaydi.
    const author = dto.isAnonymous ? 'Anonim' : `${me.lastName ?? ''} ${me.firstName}`.trim();
    const head = dto.title ? `*${dto.title}*\n` : '';
    const text =
      "💡 *Yangi taklif*\n\n" +
      head +
      `${dto.text}\n\n` +
      `👤 ${author}`;
    await notifyCEOs(text);

    res.status(201).json({ ok: true, suggestion: serializeSuggestion(suggestion, true) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    logger.error({ err }, 'suggestions POST xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** GET /api/suggestions/mine — joriy foydalanuvchining takliflari. */
suggestionsRouter.get('/mine', async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const list = await suggestionsService.getForUser(req.auth!.user._id);
    res.json({ ok: true, suggestions: list.map((s) => serializeSuggestion(s, true)) });
  } catch (err) {
    logger.error({ err }, 'suggestions/mine xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** GET /api/suggestions/count-new — ko'rilmagan (new) takliflar soni (CEO rozetkasi). */
suggestionsRouter.get('/count-new', requireCeo, async (_req: Request, res: Response) => {
  try {
    await connectDatabase();
    const count = await suggestionsService.countNew();
    res.json({ ok: true, count });
  } catch (err) {
    logger.error({ err }, 'suggestions/count-new xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** GET /api/suggestions?status=new — CEO ro'yxati. */
suggestionsRouter.get('/', requireCeo, async (req: Request, res: Response) => {
  try {
    await connectDatabase();
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const list = await suggestionsService.list({ status, limit: 300 });
    res.json({ ok: true, suggestions: list.map((s) => serializeSuggestion(s, false)) });
  } catch (err) {
    logger.error({ err }, 'suggestions GET xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

/** POST /api/suggestions/:id/decide — CEO holat + javob belgilaydi. */
suggestionsRouter.post('/:id/decide', requireCeo, async (req: Request, res: Response) => {
  const id = getObjectIdParam(req, res, 'id');
  if (!id) return;
  try {
    await connectDatabase();
    const dto = decideSuggestionDto.parse(req.body);
    const me = req.auth!.user;

    const updated = await suggestionsService.decide(id, me._id, dto.status, dto.response);

    await auditLogsService.log({
      userId: me._id,
      action: 'suggestion.decided',
      targetType: 'Suggestion',
      targetId: updated._id,
      meta: { status: dto.status },
    });

    // Muallifga xabar (anonim bo'lsa ham — taklif egasi o'zi biladi).
    const author = await usersService.findById(updated.userId);
    if (author?.telegramId) {
      let msg =
        `💡 Taklifingiz holati: *${STATUS_LABELS[dto.status]}*` +
        (updated.title ? `\n📌 ${updated.title}` : '');
      if (dto.response) msg += `\n💬 ${dto.response}`;
      await notifyUser(author.telegramId, msg);
    }

    res.json({ ok: true, suggestion: serializeSuggestion(updated, false) });
  } catch (err) {
    if (err instanceof ZodError) return zodErr(res, err);
    if (err instanceof SuggestionsError) {
      return void res.status(404).json({ ok: false, error: err.message });
    }
    logger.error({ err }, 'suggestions decide xato');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

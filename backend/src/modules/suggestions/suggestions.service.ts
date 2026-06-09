import { Types } from 'mongoose';
import {
  Suggestion,
  type SuggestionDoc,
  type SuggestionStatus,
} from './suggestions.model.js';

export class SuggestionsError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'SuggestionsError';
  }
}

export class SuggestionsService {
  /** Yangi taklif (status=new). Bo'lim/do'kon snapshot'i muallifdan olinadi. */
  async create(params: {
    userId: Types.ObjectId;
    storeId?: Types.ObjectId | null;
    division?: string | null;
    title?: string;
    text: string;
    isAnonymous?: boolean;
  }): Promise<SuggestionDoc> {
    return Suggestion.create({
      userId: params.userId,
      storeId: params.storeId ?? null,
      division: params.division ?? null,
      title: params.title ?? '',
      text: params.text,
      isAnonymous: params.isAnonymous ?? false,
      status: 'new',
    });
  }

  /** Xodimning o'z takliflari. */
  async getForUser(userId: Types.ObjectId, limit = 50): Promise<SuggestionDoc[]> {
    return Suggestion.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }

  /** CEO ro'yxati (filtr: status). */
  async list(filters: { status?: string; limit?: number } = {}): Promise<SuggestionDoc[]> {
    const q: Record<string, unknown> = {};
    if (filters.status) q.status = filters.status;
    return Suggestion.find(q)
      .sort({ createdAt: -1 })
      .limit(filters.limit ?? 200)
      .populate('userId', 'firstName lastName')
      .populate('storeId', 'name');
  }

  /** Ko'rilmagan (new) takliflar soni — rozetka uchun. */
  async countNew(): Promise<number> {
    return Suggestion.countDocuments({ status: 'new' });
  }

  async findById(id: Types.ObjectId | string): Promise<SuggestionDoc | null> {
    return Suggestion.findById(id);
  }

  /** CEO qarori — holat + javob. */
  async decide(
    id: Types.ObjectId | string,
    ceoId: Types.ObjectId,
    status: SuggestionStatus,
    response = '',
  ): Promise<SuggestionDoc> {
    const updated = await Suggestion.findByIdAndUpdate(
      id,
      { status, ceoResponse: response, decidedBy: ceoId, decidedAt: new Date() },
      { new: true },
    );
    if (!updated) throw new SuggestionsError('NOT_FOUND', 'Taklif topilmadi');
    return updated;
  }
}

export const suggestionsService = new SuggestionsService();

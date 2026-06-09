import { Types } from 'mongoose';
import {
  Reward,
  type RewardDoc,
  type RewardType,
  type RewardInitiator,
} from './rewards.model.js';
import { User } from '../users/users.model.js';
import { startOfTashkentDay } from '../../core/utils/date.js';

export class RewardsError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'INVALID_RECIPIENT' | 'ALREADY_DECIDED',
    message: string,
  ) {
    super(message);
    this.name = 'RewardsError';
  }
}

export class RewardsService {
  /**
   * Qo'lda rag'bat so'rovi/berish (tasdiq zanjiri bilan, status=pending).
   * Bo'lim snapshot'i recipient'dan olinadi.
   */
  async request(params: {
    recipientId: Types.ObjectId | string;
    amount: number;
    reason: string;
    requestedBy: Types.ObjectId | string;
    initiatorRole: RewardInitiator;
  }): Promise<RewardDoc> {
    const recipient = await User.findById(params.recipientId);
    if (!recipient || !recipient.isActive) {
      throw new RewardsError('INVALID_RECIPIENT', 'Rag\'bat oluvchi topilmadi');
    }
    return Reward.create({
      userId: recipient._id,
      storeId: recipient.storeId ?? null,
      division: recipient.division ?? null,
      amount: params.amount,
      reason: params.reason,
      type: 'manual',
      status: 'pending',
      date: startOfTashkentDay(),
      requestedBy: params.requestedBy,
      initiatorRole: params.initiatorRole,
    });
  }

  async approve(
    id: Types.ObjectId | string,
    adminId: Types.ObjectId,
    comment = '',
    amount?: number,
  ): Promise<RewardDoc> {
    const patch: Record<string, unknown> = {
      status: 'approved',
      decidedBy: adminId,
      decidedAt: new Date(),
      adminComment: comment,
    };
    // Tasdiqlovchi miqdorni belgilagan bo'lsa (xodim o'ziga miqdorsiz so'ragan holat).
    if (amount !== undefined) patch.amount = amount;
    const updated = await Reward.findOneAndUpdate(
      { _id: id, status: 'pending' },
      patch,
      { new: true },
    );
    if (!updated) throw new RewardsError('ALREADY_DECIDED', 'So\'rov topilmadi yoki allaqachon hal qilingan');
    return updated;
  }

  async reject(
    id: Types.ObjectId | string,
    adminId: Types.ObjectId,
    comment = '',
  ): Promise<RewardDoc> {
    const updated = await Reward.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { status: 'rejected', decidedBy: adminId, decidedAt: new Date(), adminComment: comment },
      { new: true },
    );
    if (!updated) throw new RewardsError('ALREADY_DECIDED', 'So\'rov topilmadi yoki allaqachon hal qilingan');
    return updated;
  }

  async findById(id: Types.ObjectId | string): Promise<RewardDoc | null> {
    return Reward.findById(id);
  }

  /**
   * Avto rag'bat yaratish (kunlik job). Status darhol `approved`.
   * Idempotent — o'sha kun + tur + nishonga allaqachon yaratilgan bo'lsa qaytaradi.
   */
  async createAuto(params: {
    type: Extract<RewardType, 'auto_store' | 'auto_employee'>;
    amount: number;
    reason: string;
    date: Date;
    userId?: Types.ObjectId | string | null;
    storeId?: Types.ObjectId | string | null;
    division?: string | null;
  }): Promise<{ reward: RewardDoc; created: boolean }> {
    const day = startOfTashkentDay(params.date);
    const dupQuery: Record<string, unknown> = { type: params.type, date: day };
    if (params.type === 'auto_employee') dupQuery.userId = params.userId;
    else dupQuery.storeId = params.storeId;

    const existing = await Reward.findOne(dupQuery);
    if (existing) return { reward: existing, created: false };

    const reward = await Reward.create({
      userId: params.userId ?? null,
      storeId: params.storeId ?? null,
      division: params.division ?? null,
      amount: params.amount,
      reason: params.reason,
      type: params.type,
      status: 'approved',
      date: day,
      requestedBy: null,
      initiatorRole: 'system',
      decidedAt: new Date(),
    });
    return { reward, created: true };
  }

  /** Ro'yxat — admin/CEO uchun (filtr: status, sana oralig'i). */
  async list(filters: {
    status?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  } = {}): Promise<RewardDoc[]> {
    const q: Record<string, unknown> = {};
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      const dateQ: Record<string, Date> = {};
      if (filters.from) dateQ.$gte = filters.from;
      if (filters.to) dateQ.$lte = filters.to;
      q.date = dateQ;
    }
    return Reward.find(q)
      .sort({ createdAt: -1 })
      .limit(filters.limit ?? 100)
      .populate('userId', 'firstName lastName')
      .populate('storeId', 'name')
      .populate('requestedBy', 'firstName lastName');
  }

  async findPending(): Promise<RewardDoc[]> {
    return Reward.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('userId', 'firstName lastName')
      .populate('storeId', 'name')
      .populate('requestedBy', 'firstName lastName');
  }

  /** Xodimning o'z rag'batlari. */
  async getForUser(userId: Types.ObjectId, limit = 50): Promise<RewardDoc[]> {
    return Reward.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }

  /**
   * Oylik (yoki ixtiyoriy davr) — tasdiqlangan rag'batlar xodim bo'yicha jamlanadi.
   */
  async approvedByUser(
    from: Date,
    to: Date,
  ): Promise<Array<{ userId: Types.ObjectId; total: number; count: number }>> {
    return Reward.aggregate([
      { $match: { status: 'approved', userId: { $ne: null }, date: { $gte: from, $lte: to } } },
      { $group: { _id: '$userId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, userId: '$_id', total: 1, count: 1 } },
    ]);
  }

  /** Davr bo'yicha do'kon rag'batlari (auto_store). */
  async approvedByStore(
    from: Date,
    to: Date,
  ): Promise<Array<{ storeId: Types.ObjectId; total: number; count: number }>> {
    return Reward.aggregate([
      { $match: { status: 'approved', type: 'auto_store', date: { $gte: from, $lte: to } } },
      { $group: { _id: '$storeId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, storeId: '$_id', total: 1, count: 1 } },
    ]);
  }
}

export const rewardsService = new RewardsService();

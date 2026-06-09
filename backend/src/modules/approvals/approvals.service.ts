import type { Types } from 'mongoose';
import { Approval, type ApprovalDoc, type ApprovalType } from './approvals.model.js';
import type { CreateApprovalDto } from './approvals.dto.js';
import { startOfTashkentDay } from '../../core/utils/date.js';
import { logger } from '../../core/logger/logger.js';
import { schedulesService } from '../schedules/schedules.service.js';

export class ApprovalsError extends Error {
  constructor(public readonly code: 'DUPLICATE', message: string) {
    super(message);
    this.name = 'ApprovalsError';
  }
}

export class ApprovalsService {
  async create(dto: CreateApprovalDto): Promise<ApprovalDoc> {
    // Bir kun + bir turi uchun bitta faol so'rov bo'lishi yetarli
    const existing = await Approval.findOne({
      userId: dto.userId,
      type: dto.type,
      requestedDate: dto.requestedDate,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      throw new ApprovalsError(
        'DUPLICATE',
        existing.status === 'approved'
          ? 'Bu kun uchun ruxsat allaqachon tasdiqlangan'
          : "Bu kun uchun so'rov yuborilgan — javob kutilmoqda",
      );
    }
    const approval = await Approval.create({
      userId: dto.userId,
      storeId: dto.storeId,
      type: dto.type,
      requestedDate: dto.requestedDate,
      requestedTime: dto.requestedTime ?? '',
      reason: dto.reason,
      status: 'pending',
    });
    logger.info(
      { approvalId: approval._id.toString(), type: dto.type },
      "Yangi tasdiq so'rovi yaratildi",
    );
    return approval;
  }

  async findById(id: Types.ObjectId): Promise<ApprovalDoc | null> {
    return Approval.findById(id);
  }

  async findPending(): Promise<ApprovalDoc[]> {
    return Approval.find({ status: 'pending' }).sort({ createdAt: 1 });
  }

  async findPendingByUser(userId: Types.ObjectId): Promise<ApprovalDoc[]> {
    return Approval.find({ userId, status: 'pending' }).sort({ requestedDate: 1 });
  }

  async approve(
    approvalId: Types.ObjectId,
    adminId: Types.ObjectId,
    comment = '',
  ): Promise<ApprovalDoc | null> {
    const approval = await Approval.findOneAndUpdate(
      { _id: approvalId, status: 'pending' },
      {
        status: 'approved',
        decidedBy: adminId,
        decidedAt: new Date(),
        adminComment: comment,
      },
      { new: true },
    );

    // Dam olish so'rovi tasdiqlansa — o'sha kun jadvaliga "dam olish" yoziladi,
    // shunda kelmaganlikni aniqlash jobi uni absent deb belgilamaydi.
    if (approval && approval.type === 'day_off') {
      await schedulesService.setShift({
        userId: approval.userId,
        storeId: approval.storeId,
        date: approval.requestedDate,
        shiftType: 'day_off',
        source: 'requested',
        assignedBy: adminId,
      });
    }

    return approval;
  }

  async reject(
    approvalId: Types.ObjectId,
    adminId: Types.ObjectId,
    comment = '',
  ): Promise<ApprovalDoc | null> {
    return Approval.findOneAndUpdate(
      { _id: approvalId, status: 'pending' },
      {
        status: 'rejected',
        decidedBy: adminId,
        decidedAt: new Date(),
        adminComment: comment,
      },
      { new: true },
    );
  }

  async setAdminMessage(
    approvalId: Types.ObjectId,
    adminChatId: number,
    adminMessageId: number,
  ): Promise<void> {
    await Approval.findByIdAndUpdate(approvalId, { adminChatId, adminMessageId });
  }

  /**
   * Bugungi sana uchun tasdiqlangan ruxsat bormi tekshiradi.
   * Davomat servisi tomonidan ishlatiladi.
   */
  async findApprovedForToday(
    userId: Types.ObjectId,
    type: ApprovalType,
  ): Promise<ApprovalDoc | null> {
    return Approval.findOne({
      userId,
      type,
      requestedDate: startOfTashkentDay(),
      status: 'approved',
    });
  }
}

export const approvalsService = new ApprovalsService();

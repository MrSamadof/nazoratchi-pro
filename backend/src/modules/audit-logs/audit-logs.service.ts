import type { Types } from 'mongoose';
import { AuditLog, type AuditAction } from './audit-logs.model.js';
import { logger } from '../../core/logger/logger.js';

interface LogParams {
  userId?: Types.ObjectId | null;
  telegramId?: number | null;
  action: AuditAction;
  targetType?: string;
  targetId?: Types.ObjectId | null;
  meta?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  chatId?: number;
  messageId?: number;
}

export class AuditLogsService {
  async log(params: LogParams): Promise<void> {
    try {
      await AuditLog.create({
        userId: params.userId ?? null,
        telegramId: params.telegramId ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        meta: params.meta ?? {},
        success: params.success ?? true,
        errorMessage: params.errorMessage ?? '',
        chatId: params.chatId ?? null,
        messageId: params.messageId ?? null,
      });
    } catch (err) {
      // Audit log o'zi xato bersa, asosiy ish to'xtamasin
      logger.error({ err, action: params.action }, 'Audit log yozib bo\'lmadi');
    }
  }
}

export const auditLogsService = new AuditLogsService();

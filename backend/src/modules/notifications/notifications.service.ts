import { Types } from 'mongoose';
import {
  Notification,
  type NotificationDoc,
  type NotificationType,
} from './notifications.model.js';
import { User } from '../users/users.model.js';
import { notifyUser } from '../../notifications/telegram.js';
import { logger } from '../../core/logger/logger.js';

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  meta?: Record<string, unknown>;
  /** Telegram'ga ham yuborilsinmi (telegramId bo'lsa). Default true. */
  telegram?: boolean;
}

export class NotificationsService {
  /**
   * Bitta foydalanuvchiga bildirishnoma. In-app yoziladi, telegram bo'lsa mirror qilinadi.
   */
  async notify(userId: Types.ObjectId | string, input: NotifyInput): Promise<NotificationDoc> {
    const doc = await Notification.create({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      link: input.link ?? '',
      meta: input.meta ?? {},
    });

    if (input.telegram !== false) {
      // Telegram — fire-and-forget, xato bo'lsa in-app baribir saqlanadi.
      void this.mirrorToTelegram(userId, input).catch((err) =>
        logger.warn({ err }, 'Telegram mirror xato'),
      );
    }
    return doc;
  }

  /**
   * Bir nechta foydalanuvchiga (masalan butun bo'lim/jamoa).
   */
  async notifyMany(userIds: Array<Types.ObjectId | string>, input: NotifyInput): Promise<number> {
    if (userIds.length === 0) return 0;
    const docs = userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      link: input.link ?? '',
      meta: input.meta ?? {},
    }));
    await Notification.insertMany(docs);

    if (input.telegram !== false) {
      void this.mirrorManyToTelegram(userIds, input).catch((err) =>
        logger.warn({ err }, 'Telegram mirror (many) xato'),
      );
    }
    return docs.length;
  }

  private async mirrorToTelegram(
    userId: Types.ObjectId | string,
    input: NotifyInput,
  ): Promise<void> {
    const user = await User.findById(userId).select('telegramId');
    if (user?.telegramId) {
      await notifyUser(user.telegramId, this.formatTelegram(input));
    }
  }

  private async mirrorManyToTelegram(
    userIds: Array<Types.ObjectId | string>,
    input: NotifyInput,
  ): Promise<void> {
    const users = await User.find({ _id: { $in: userIds }, telegramId: { $ne: null } }).select(
      'telegramId',
    );
    const text = this.formatTelegram(input);
    for (const u of users) {
      if (u.telegramId) await notifyUser(u.telegramId, text);
    }
  }

  private formatTelegram(input: NotifyInput): string {
    return `🔔 *${input.title}*${input.body ? `\n\n${input.body}` : ''}`;
  }

  async listForUser(userId: Types.ObjectId, limit = 30): Promise<NotificationDoc[]> {
    return Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }

  async unreadCount(userId: Types.ObjectId): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false });
  }

  async markRead(id: Types.ObjectId | string, userId: Types.ObjectId): Promise<void> {
    await Notification.updateOne(
      { _id: id, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(userId: Types.ObjectId): Promise<void> {
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}

export const notificationsService = new NotificationsService();

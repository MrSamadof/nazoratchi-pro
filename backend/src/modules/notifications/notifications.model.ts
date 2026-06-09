import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from 'mongoose';

/**
 * In-app bildirishnoma turlari.
 */
export const NOTIFICATION_TYPES = [
  'rule_published',
  'task_assigned',
  'task_extension_requested',
  'task_extension_decided',
  'task_status_changed',
  'reward_decided',
  'approval_decided',
  'general',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'general' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    // Ilova ichidagi yo'l (masalan '/tasks') — bosilganda o'sha sahifaga o'tadi.
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// "O'qilmaganlar" va "so'nggilar" so'rovlari uchun.
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export type NotificationDocType = InferSchemaType<typeof notificationSchema>;
export type NotificationDoc = HydratedDocument<NotificationDocType>;
export const Notification =
  mongoose.models.Notification ?? model('Notification', notificationSchema);

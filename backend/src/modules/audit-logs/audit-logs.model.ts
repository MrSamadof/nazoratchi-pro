import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const AUDIT_ACTIONS = [
  'user.register',
  'user.login',
  'user.login_failed',
  'user.logout',
  'user.approved',
  'user.deactivated',
  'attendance.check_in',
  'attendance.check_out',
  'attendance.penalty_accepted',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
  'sale.created',
  'suggestion.created',
  'suggestion.decided',
  'admin.config_changed',
  'admin.report_generated',
  'system.error',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    telegramId: { type: Number, default: null },

    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },

    targetType: { type: String, default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },

    meta: { type: Schema.Types.Mixed, default: {} },

    success: { type: Boolean, default: true },
    errorMessage: { type: String, default: '' },

    chatId: { type: Number, default: null },
    messageId: { type: Number, default: null },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

export type AuditLogType = InferSchemaType<typeof auditLogSchema>;
export type AuditLogDoc = HydratedDocument<AuditLogType>;
export const AuditLog = mongoose.models.AuditLog ?? model('AuditLog', auditLogSchema);

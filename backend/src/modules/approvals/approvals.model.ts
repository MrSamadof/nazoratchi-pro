import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const APPROVAL_TYPES = ['late_arrival', 'early_leave', 'day_off'] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  late_arrival: 'Kech kelish',
  early_leave: 'Erta ketish',
  day_off: 'Dam olish',
};

export const APPROVAL_STATUS = ['pending', 'approved', 'rejected', 'expired'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUS)[number];

const approvalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },

    type: { type: String, enum: APPROVAL_TYPES, required: true },
    requestedDate: { type: Date, required: true, index: true },
    requestedTime: { type: String, default: '' },
    reason: { type: String, default: '' },

    status: { type: String, enum: APPROVAL_STATUS, default: 'pending', index: true },

    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    adminComment: { type: String, default: '' },

    adminChatId: { type: Number, default: null },
    adminMessageId: { type: Number, default: null },
  },
  { timestamps: true },
);

approvalSchema.index({ status: 1, requestedDate: 1 });
approvalSchema.index({ userId: 1, type: 1, requestedDate: 1 });

export type ApprovalDocType = InferSchemaType<typeof approvalSchema>;
export type ApprovalDoc = HydratedDocument<ApprovalDocType>;
export const Approval = mongoose.models.Approval ?? model('Approval', approvalSchema);

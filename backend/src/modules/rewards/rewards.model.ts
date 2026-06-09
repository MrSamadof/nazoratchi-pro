import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from 'mongoose';
import { DIVISIONS } from '../../core/config/constants.js';

/**
 * Rag'bat turi:
 *  - manual        — qo'lda (xodim so'raydi yoki rahbar beradi), tasdiq zanjiri bor
 *  - auto_store    — kunlik avto: eng ko'p sotgan do'kon (recipient = storeId, userId null)
 *  - auto_employee — kunlik avto: bo'lim bo'yicha eng ko'p sotgan xodim
 */
export const REWARD_TYPES = ['manual', 'auto_store', 'auto_employee'] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const REWARD_STATUS = ['pending', 'approved', 'rejected'] as const;
export type RewardStatus = (typeof REWARD_STATUS)[number];

/** Kim boshlagani — tasdiq zanjirini belgilaydi. */
export const REWARD_INITIATORS = ['employee', 'manager', 'system'] as const;
export type RewardInitiator = (typeof REWARD_INITIATORS)[number];

const rewardSchema = new Schema(
  {
    // Rag'bat oluvchi xodim. Do'kon rag'bati (auto_store) uchun null.
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
    // Hisobot uchun bo'lim snapshot'i (xodimning o'sha paytdagi bo'limi).
    division: { type: String, enum: [...DIVISIONS, null], default: null },

    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },

    type: { type: String, enum: REWARD_TYPES, default: 'manual', index: true },
    status: { type: String, enum: REWARD_STATUS, default: 'pending', index: true },

    // Rag'bat tegishli kun (Tashkent kuni boshi) — hisobot va idempotentlik uchun.
    date: { type: Date, required: true, index: true },

    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    initiatorRole: { type: String, enum: REWARD_INITIATORS, required: true },

    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    adminComment: { type: String, default: '' },
  },
  { timestamps: true },
);

rewardSchema.index({ status: 1, date: -1 });
rewardSchema.index({ userId: 1, date: -1 });
rewardSchema.index({ type: 1, date: 1 });

export type RewardDocType = InferSchemaType<typeof rewardSchema>;
export type RewardDoc = HydratedDocument<RewardDocType>;
export const Reward = mongoose.models.Reward ?? model('Reward', rewardSchema);

import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const PENALTY_TYPES = ['late_arrival', 'early_leave', 'absence', 'other'] as const;
export type PenaltyType = (typeof PENALTY_TYPES)[number];

const penaltyRuleSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: PENALTY_TYPES, required: true, index: true },

    minMinutes: { type: Number, default: 0 },
    maxMinutes: { type: Number, default: null },

    amount: { type: Number, required: true, min: 0 },

    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null },

    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

penaltyRuleSchema.index({ type: 1, isActive: 1 });

export type PenaltyRuleType = InferSchemaType<typeof penaltyRuleSchema>;
export type PenaltyRuleDoc = HydratedDocument<PenaltyRuleType>;
export const PenaltyRule = mongoose.models.PenaltyRule ?? model('PenaltyRule', penaltyRuleSchema);

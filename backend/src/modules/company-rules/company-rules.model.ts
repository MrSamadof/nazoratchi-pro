import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * Kompaniya qoidalari (admin so'rasa qaytariladi).
 * Eski "Qoidalar - Router" tool o'rni.
 */
const companyRuleSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, default: 'general' },
    content: { type: String, required: true },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

companyRuleSchema.index({ category: 1, order: 1 });

export type CompanyRuleType = InferSchemaType<typeof companyRuleSchema>;
export type CompanyRuleDoc = HydratedDocument<CompanyRuleType>;
export const CompanyRule = mongoose.models.CompanyRule ?? model('CompanyRule', companyRuleSchema);

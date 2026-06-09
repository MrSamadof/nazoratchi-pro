import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from 'mongoose';
import { DIVISIONS } from '../../core/config/constants.js';

/**
 * Xodim taklifi — ish jarayoni/ishxona unumi bo'yicha foydali g'oyalar.
 * To'g'ridan-to'g'ri CEO ga boradi (oraliq tasdiqsiz).
 *
 * Holatlar:
 *  - new        — yangi, hali ko'rilmagan
 *  - reviewing  — CEO ko'rib chiqmoqda
 *  - accepted   — qabul qilindi
 *  - rejected   — rad etildi
 */
export const SUGGESTION_STATUS = ['new', 'reviewing', 'accepted', 'rejected'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUS)[number];

const suggestionSchema = new Schema(
  {
    // Yozgan xodim — anonim bo'lsa ham saqlanadi (egasi o'z taklifini kuzatishi uchun),
    // faqat CEO ro'yxatida ism yashiriladi.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    division: { type: String, enum: [...DIVISIONS, null], default: null },

    title: { type: String, default: '', trim: true },
    text: { type: String, required: true, trim: true },

    isAnonymous: { type: Boolean, default: false },

    status: { type: String, enum: SUGGESTION_STATUS, default: 'new', index: true },
    ceoResponse: { type: String, default: '' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

suggestionSchema.index({ status: 1, createdAt: -1 });
suggestionSchema.index({ userId: 1, createdAt: -1 });

export type SuggestionType = InferSchemaType<typeof suggestionSchema>;
export type SuggestionDoc = HydratedDocument<SuggestionType>;
export const Suggestion = mongoose.models.Suggestion ?? model('Suggestion', suggestionSchema);

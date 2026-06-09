import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const SALE_SOURCE = ['manual', 'billz'] as const;
export type SaleSource = (typeof SALE_SOURCE)[number];

/**
 * Xodim qo'lda kiritgan savdo.
 * Billz dan kelgan savdo `billz` modulida saqlanadi.
 */
const saleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },

    date: { type: Date, required: true, index: true },
    quantity: { type: Number, required: true, min: 0 },
    amount: { type: Number, default: 0 },

    source: { type: String, enum: SALE_SOURCE, default: 'manual' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

saleSchema.index({ storeId: 1, date: -1 });
saleSchema.index({ userId: 1, date: -1 });

export type SaleType = InferSchemaType<typeof saleSchema>;
export type SaleDoc = HydratedDocument<SaleType>;
export const Sale = mongoose.models.Sale ?? model('Sale', saleSchema);

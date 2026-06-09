import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * Billz API dan olingan kunlik savdo cache.
 */
const billzSaleSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    date: { type: Date, required: true, index: true },

    totalAmount: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },

    rawResponse: { type: Schema.Types.Mixed, default: null },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

billzSaleSchema.index({ storeId: 1, date: 1 }, { unique: true });
billzSaleSchema.index({ date: -1 });

export type BillzSaleType = InferSchemaType<typeof billzSaleSchema>;
export type BillzSaleDoc = HydratedDocument<BillzSaleType>;
export const BillzSale = mongoose.models.BillzSale ?? model('BillzSale', billzSaleSchema);

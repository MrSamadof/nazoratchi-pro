import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const STORE_KINDS = ['store', 'office'] as const;
export type StoreKind = (typeof STORE_KINDS)[number];

const storeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Ish joyi turi: do'kon (savdo) yoki ofis (savdosiz — buxgalteriya, HR, sklad...).
    // Ofis Billz/savdo hisobotlariga kirmaydi, faqat davomat (keldim-ketdim) uchun.
    kind: { type: String, enum: STORE_KINDS, default: 'store' },

    hasBillz: { type: Boolean, default: false },
    billzUuid: { type: String, default: null, sparse: true },

    workStartTime: { type: String, default: '09:00' },
    workEndTime: { type: String, default: '18:00' },

    address: { type: String, default: '' },
    phone: { type: String, default: '' },

    // Geofencing — davomatda joylashuv tekshiruvi uchun
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    geofenceRadiusMeters: { type: Number, default: 100, min: 10, max: 5000 },

    // CEO sozlash uchun savdo maqsadlari
    weeklyTarget: { type: Number, default: 0 },
    monthlyTarget: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

storeSchema.index({ hasBillz: 1, isActive: 1 });

export type StoreType = InferSchemaType<typeof storeSchema>;
export type StoreDoc = HydratedDocument<StoreType>;
export const Store = mongoose.models.Store ?? model('Store', storeSchema);

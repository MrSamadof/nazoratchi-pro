import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument, type Types, type Model } from 'mongoose';
import { DIVISIONS, SHIFT_TYPES } from '../../core/config/constants.js';

export const USER_ROLES = ['employee', 'manager', 'ceo'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    // Telefon — asosiy identifikator. Login va register shu orqali.
    phone: { type: String, required: true, trim: true },

    // Telegram bog'lash — ixtiyoriy. Faqat notifikatsiya yuborish uchun ishlatiladi.
    telegramId: { type: Number, default: null },
    telegramUsername: { type: String, default: null },
    // Bir martalik bog'lash tokeni (deep-link orqali). Bog'langach tozalanadi.
    telegramLinkToken: { type: String, default: null },
    telegramLinkExpiresAt: { type: Date, default: null },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },

    passwordHash: { type: String, required: true },

    role: { type: String, enum: USER_ROLES, default: 'employee', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null },

    // Bo'lim — savdo xodimlari uchun (dubai_house | amir). Rahbar/CEO uchun null bo'lishi mumkin.
    division: { type: String, enum: [...DIVISIONS, null], default: null },

    // Doimiy (default) smena — xodim qo'shilganda belgilanadi. O'sha kunga alohida
    // jadval (Schedule) yozuvi bo'lmasa, davomat shu smenaga bog'lanadi. null bo'lsa
    // do'kon standart ish vaqti ishlatiladi (eski xatti-harakat).
    defaultShiftType: { type: String, enum: [...SHIFT_TYPES, null], default: null },

    // Faqat defaultShiftType === 'custom' bo'lganda to'ladi — "HH:mm".
    defaultShiftStartTime: { type: String, default: null },
    defaultShiftEndTime: { type: String, default: null },

    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.virtual('fullName').get(function () {
  return `${this.lastName} ${this.firstName}`.trim();
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete (ret as Record<string, unknown>).passwordHash;
    return ret;
  },
});

userSchema.index({ lastName: 1, firstName: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ storeId: 1, isActive: 1 });
userSchema.index({ division: 1, isActive: 1 });
// Telefon — haqiqiy shaxs identifikatori. Bir telefon = bir user.
userSchema.index({ phone: 1 }, { unique: true });
// Telegram ID — ixtiyoriy, lekin bog'langan bo'lsa noyob bo'lishi kerak.
userSchema.index(
  { telegramId: 1 },
  { unique: true, partialFilterExpression: { telegramId: { $type: 'number' } } },
);
// Bog'lash tokeni bo'yicha tez qidirish (bot listener uchun).
userSchema.index(
  { telegramLinkToken: 1 },
  { partialFilterExpression: { telegramLinkToken: { $type: 'string' } } },
);

export type UserType = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export type UserDoc = HydratedDocument<UserType>;
export const User: Model<UserType> =
  (mongoose.models.User as Model<UserType>) ?? model<UserType>('User', userSchema);

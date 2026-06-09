import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose';

/**
 * Web sessiya — login bo'lganda yaratiladi.
 * Token cookie ga yoziladi (`httpOnly`), DB da to'liq yozuv saqlanadi.
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },

    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },

    lastUsedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionType = InferSchemaType<typeof sessionSchema>;
export type SessionDoc = HydratedDocument<SessionType>;
// Next.js HMR da model qayta ro'yxatga olinishini oldini olamiz
export const Session: Model<SessionType> =
  (mongoose.models.Session as Model<SessionType>) ?? model<SessionType>('Session', sessionSchema);

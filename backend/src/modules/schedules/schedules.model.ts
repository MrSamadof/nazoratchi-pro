import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from 'mongoose';
import { SHIFT_TYPES } from '../../core/config/constants.js';

/**
 * Smena manbasi:
 *  - scheduled — rahbar jadval tuzganda
 *  - swap      — kun ichida ikki xodim smenasi almashtirilganda
 *  - requested — xodim "dam olish" so'rovi tasdiqlanganda
 */
export const SCHEDULE_SOURCES = ['scheduled', 'swap', 'requested'] as const;
export type ScheduleSource = (typeof SCHEDULE_SOURCES)[number];

const scheduleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },

    // Smena kuni (Toshkent kuni boshi, UTC saqlanadi).
    date: { type: Date, required: true, index: true },

    shiftType: { type: String, enum: SHIFT_TYPES, required: true },

    // HH:mm — odatda shiftType'dan kelib chiqadi, lekin alohida o'zgartirilishi mumkin.
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },

    source: { type: String, enum: SCHEDULE_SOURCES, default: 'scheduled' },
    note: { type: String, default: '' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// Bir xodim — bir kun = bitta smena yozuvi.
scheduleSchema.index({ userId: 1, date: 1 }, { unique: true });
scheduleSchema.index({ storeId: 1, date: 1 });

export type ScheduleType = InferSchemaType<typeof scheduleSchema>;
export type ScheduleDoc = HydratedDocument<ScheduleType>;
export const Schedule =
  mongoose.models.Schedule ?? model('Schedule', scheduleSchema);

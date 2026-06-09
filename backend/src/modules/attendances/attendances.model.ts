import mongoose, { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const ATTENDANCE_STATUS = ['present', 'late', 'left_early', 'absent'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

const attendanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },

    date: { type: Date, required: true, index: true },

    // O'sha kungi smena (jadvaldan) — hisobot va kech/erta hisobi uchun.
    // null bo'lsa do'kon standart ish vaqti ishlatilgan.
    shiftType: {
      type: String,
      enum: ['morning', 'evening', 'flexible', 'day_off', null],
      default: null,
    },

    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },

    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },

    penaltyAmount: { type: Number, default: 0 },
    penaltyAccepted: { type: Boolean, default: false },
    penaltyAcceptedAt: { type: Date, default: null },

    approvedLateBy: { type: Schema.Types.ObjectId, ref: 'Approval', default: null },
    approvedEarlyBy: { type: Schema.Types.ObjectId, ref: 'Approval', default: null },

    status: { type: String, enum: ATTENDANCE_STATUS, default: 'present' },
    notes: { type: String, default: '' },

    // Geofencing — `address` reverse-geocoding orqali to'ldiriladi (best-effort).
    checkInLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      distanceMeters: { type: Number, default: null },
      address: { type: String, default: null },
    },
    checkOutLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      distanceMeters: { type: Number, default: null },
      address: { type: String, default: null },
    },
    checkInOffSite: { type: Boolean, default: false },
    checkOutOffSite: { type: Boolean, default: false },
    checkInSource: { type: String, enum: ['store', 'other'], default: 'store' },
    checkInNote: { type: String, default: '' },
    checkOutSource: { type: String, enum: ['store', 'other'], default: 'store' },
    checkOutNote: { type: String, default: '' },
  },
  { timestamps: true },
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ storeId: 1, date: -1 });
attendanceSchema.index({ date: -1, status: 1 });

export type AttendanceType = InferSchemaType<typeof attendanceSchema>;
export type AttendanceDoc = HydratedDocument<AttendanceType>;
export const Attendance = mongoose.models.Attendance ?? model('Attendance', attendanceSchema);

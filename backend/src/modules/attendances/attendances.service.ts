import type { Types } from 'mongoose';
import { Attendance, type AttendanceDoc, type AttendanceStatus } from './attendances.model.js';
import { Approval } from '../approvals/approvals.model.js';
import type { StoreDoc } from '../stores/stores.model.js';
import { penaltiesService } from '../penalties/penalties.service.js';
import { schedulesService } from '../schedules/schedules.service.js';
import { User } from '../users/users.model.js';
import {
  startOfTashkentDay,
  tashkentTimeToday,
  minutesBetween,
  now,
  addDays,
  formatApiDate,
} from '../../core/utils/date.js';
import { distanceMeters, isValidLatLng } from '../../core/utils/geo.js';

export interface CheckLocationInput {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export interface CheckInLocationInput {
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  source?: 'store' | 'other';
  note?: string;
}

export interface CheckOutLocationInput extends CheckLocationInput {
  source?: 'store' | 'other';
  note?: string;
}

interface GeoResult {
  distance: number | null;
  offSite: boolean;
}

function evaluateGeo(
  store: StoreDoc,
  location: { lat?: number | null; lng?: number | null; accuracy?: number | null } | undefined,
): GeoResult {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return { distance: null, offSite: false };
  }
  const storeLoc = store.location;
  if (!storeLoc || !isValidLatLng(storeLoc)) {
    return { distance: null, offSite: false };
  }
  const distance = distanceMeters(storeLoc, { lat: location.lat, lng: location.lng });
  const radius = store.geofenceRadiusMeters ?? 100;
  const tolerance = Math.max(0, location.accuracy ?? 0);
  return { distance, offSite: distance > radius + tolerance };
}

export class AttendanceError extends Error {
  constructor(
    public readonly code:
      | 'ALREADY_CHECKED_IN'
      | 'NOT_CHECKED_IN'
      | 'ALREADY_CHECKED_OUT'
      | 'NO_STORE',
    message: string,
  ) {
    super(message);
    this.name = 'AttendanceError';
  }
}

export interface CheckInResult {
  attendance: AttendanceDoc;
  isLate: boolean;
  lateMinutes: number;
  penaltyAmount: number;
  approved: boolean;
  offSite: boolean;
  distanceMeters: number | null;
  source: 'store' | 'other';
}

export interface CheckOutResult {
  attendance: AttendanceDoc;
  isEarly: boolean;
  earlyLeaveMinutes: number;
  penaltyAmount: number;
  approved: boolean;
  workedMinutes: number;
  offSite: boolean;
  distanceMeters: number | null;
  source: 'store' | 'other';
}

/** CEO kunlik ro'yxatdagi bitta xodim qatori (status hisoblab chiqariladi). */
export type RosterStatus =
  | 'present'
  | 'late'
  | 'left_early'
  | 'absent'
  | 'day_off'
  | 'not_checked_in';

export interface RosterRow {
  userId: string;
  name: string; // "Familiya Ism"
  storeName: string | null;
  division: string | null;
  shiftType: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: RosterStatus;
  penaltyAmount: number;
  isDayOff: boolean;
}

export interface RosterSummary {
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  leftEarly: number;
  fined: number;
  onDayOff: number;
  totalPenalty: number;
}

export interface DailyRoster {
  date: string; // YYYY-MM-DD (Tashkent)
  summary: RosterSummary;
  rows: RosterRow[]; // ism bo'yicha alifbo tartibida
}

export interface EmployeeHistoryDay {
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  penaltyAmount: number;
  shiftType: string | null;
  isDayOff: boolean;
}

export interface EmployeeHistory {
  employee: {
    id: string;
    name: string;
    storeName: string | null;
    division: string | null;
  };
  days: EmployeeHistoryDay[];
  totals: {
    present: number;
    absent: number;
    late: number;
    leftEarly: number;
    dayOff: number;
    totalPenalty: number;
  };
}

export class AttendancesService {
  /**
   * "Keldim" — bugungi kelishni qayd qiladi.
   */
  async checkIn(
    userId: Types.ObjectId,
    store: StoreDoc,
    location?: CheckInLocationInput,
  ): Promise<CheckInResult> {
    const today = startOfTashkentDay();
    const currentTime = now();

    // O'sha kungi smena — kech kelish shu smena boshlanish vaqtiga nisbatan hisoblanadi.
    // Jadval bo'lmasa do'kon standart ish vaqti ishlatiladi (eski xatti-harakat).
    // flexible (o'zgaruvchan) va day_off (dam olish) — belgilangan boshlanish yo'q, kech kelish hisoblanmaydi.
    const shift = await schedulesService.getShiftWindow(userId, today);
    const shiftStart = shift.resolved ? shift.startTime : store.workStartTime;

    // Kechikish hisobi — faqat belgilangan boshlanish vaqti bo'lsa.
    let lateMinutes = 0;
    if (shiftStart) {
      const workStart = tashkentTimeToday(shiftStart, currentTime);
      lateMinutes = Math.max(0, minutesBetween(workStart, currentTime));
    }

    // Tasdiqlangan kech kelish bormi?
    const approval = await Approval.findOne({
      userId,
      type: 'late_arrival',
      requestedDate: today,
      status: 'approved',
    });

    // Tasdiq berilgan bo'lsa — tasdiqlangan vaqtdan keyin kelganini tekshir
    let effectiveLateMinutes = lateMinutes;
    if (approval && approval.requestedTime) {
      const approvedTime = tashkentTimeToday(approval.requestedTime, currentTime);
      effectiveLateMinutes = Math.max(0, minutesBetween(approvedTime, currentTime));
    }

    let penalty = 0;
    if (effectiveLateMinutes >= 5) {
      penalty = await penaltiesService.calculatePenalty('late_arrival', effectiveLateMinutes);
    }

    const status: AttendanceStatus = effectiveLateMinutes >= 5 ? 'late' : 'present';

    const source: 'store' | 'other' = location?.source ?? 'store';
    // "other" tanlansa, do'kondan masofa hisoblansa-da, offSite avtomatik true
    const geo = evaluateGeo(store, location);
    const offSite = source === 'other' ? true : geo.offSite;
    const hasGps =
      location && typeof location.lat === 'number' && typeof location.lng === 'number';
    const checkInLocation = hasGps
      ? {
          lat: location!.lat,
          lng: location!.lng,
          accuracy: location!.accuracy ?? null,
          distanceMeters: geo.distance,
        }
      : { lat: null, lng: null, accuracy: null, distanceMeters: null };

    // Atomik: faqat checkIn hali yo'q bo'lsa yangilanadi.
    // Bir vaqtning o'zida ikkita /check-in chaqirilsa, faqat birinchisi yutadi.
    const attendance = await Attendance.findOneAndUpdate(
      { userId, date: today, checkIn: null },
      {
        $setOnInsert: {
          userId,
          storeId: store._id,
          date: today,
        },
        $set: {
          checkIn: currentTime,
          shiftType: shift.shiftType,
          lateMinutes,
          penaltyAmount: penalty,
          status,
          approvedLateBy: approval?._id ?? null,
          checkInLocation,
          checkInOffSite: offSite,
          checkInSource: source,
          checkInNote: location?.note?.trim() ?? '',
        },
      },
      { upsert: true, new: true },
    ).catch((err: unknown) => {
      // Duplicate key (E11000) — boshqa so'rov upsert qildi va checkIn-i bor
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: number }).code === 11000
      ) {
        return null;
      }
      throw err;
    });

    if (!attendance) {
      throw new AttendanceError('ALREADY_CHECKED_IN', 'Siz bugun allaqachon keldingiz');
    }

    return {
      attendance,
      isLate: effectiveLateMinutes >= 5,
      lateMinutes: effectiveLateMinutes,
      penaltyAmount: penalty,
      approved: !!approval,
      offSite,
      distanceMeters: geo.distance,
      source,
    };
  }

  /**
   * "Ketdim" — ketishni qayd qiladi.
   */
  async checkOut(
    userId: Types.ObjectId,
    store: StoreDoc,
    location?: CheckOutLocationInput,
  ): Promise<CheckOutResult> {
    const today = startOfTashkentDay();
    const currentTime = now();

    const existing = await Attendance.findOne({ userId, date: today });
    if (!existing || !existing.checkIn) {
      throw new AttendanceError(
        'NOT_CHECKED_IN',
        'Avval "Keldim" tugmasini bosing — bugun kelmagansiz',
      );
    }
    if (existing.checkOut) {
      throw new AttendanceError('ALREADY_CHECKED_OUT', 'Siz bugun allaqachon ketdingiz');
    }

    // Erta ketish hisobi — o'sha kungi smena tugash vaqtiga nisbatan.
    // flexible/day_off uchun belgilangan tugash yo'q → erta ketish hisoblanmaydi.
    const shift = await schedulesService.getShiftWindow(userId, today);
    const shiftEnd = shift.resolved ? shift.endTime : store.workEndTime;

    let earlyLeaveMinutes = 0;
    if (shiftEnd) {
      const workEnd = tashkentTimeToday(shiftEnd, currentTime);
      earlyLeaveMinutes = Math.max(0, minutesBetween(currentTime, workEnd));
    }

    const approval = await Approval.findOne({
      userId,
      type: 'early_leave',
      requestedDate: today,
      status: 'approved',
    });

    let effectiveEarlyMinutes = earlyLeaveMinutes;
    if (approval && approval.requestedTime) {
      const approvedTime = tashkentTimeToday(approval.requestedTime, currentTime);
      effectiveEarlyMinutes = Math.max(0, minutesBetween(currentTime, approvedTime));
    }

    let additionalPenalty = 0;
    if (effectiveEarlyMinutes >= 5) {
      additionalPenalty = await penaltiesService.calculatePenalty(
        'early_leave',
        effectiveEarlyMinutes,
      );
    }

    const totalPenalty = (existing.penaltyAmount ?? 0) + additionalPenalty;
    const workedMinutes = minutesBetween(existing.checkIn, currentTime);

    let newStatus: AttendanceStatus = existing.status as AttendanceStatus;
    if (effectiveEarlyMinutes >= 5 && newStatus !== 'late') {
      newStatus = 'left_early';
    }

    const source: 'store' | 'other' = location?.source ?? 'store';
    // "other" tanlansa, do'kondan masofa hisoblansa-da, offSite avtomatik true
    const geo = evaluateGeo(store, location);
    const offSite = source === 'other' ? true : geo.offSite;
    const checkOutLocation = location
      ? {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy ?? null,
          distanceMeters: geo.distance,
        }
      : { lat: null, lng: null, accuracy: null, distanceMeters: null };

    existing.checkOut = currentTime;
    existing.earlyLeaveMinutes = earlyLeaveMinutes;
    existing.penaltyAmount = totalPenalty;
    existing.status = newStatus;
    existing.approvedEarlyBy = approval?._id ?? null;
    existing.checkOutLocation = checkOutLocation;
    existing.checkOutOffSite = offSite;
    existing.checkOutSource = source;
    existing.checkOutNote = location?.note?.trim() ?? '';
    // Yangi jarima qo'shilsa, qabul qilingan flag ni qayta nolga tushiramiz
    if (additionalPenalty > 0) {
      existing.penaltyAccepted = false;
      existing.penaltyAcceptedAt = null;
    }
    await existing.save();

    return {
      attendance: existing,
      isEarly: effectiveEarlyMinutes >= 5,
      earlyLeaveMinutes: effectiveEarlyMinutes,
      penaltyAmount: additionalPenalty,
      approved: !!approval,
      workedMinutes,
      offSite,
      distanceMeters: geo.distance,
      source,
    };
  }

  /**
   * Foydalanuvchining bugungi yozuvi.
   */
  async getTodayAttendance(userId: Types.ObjectId): Promise<AttendanceDoc | null> {
    return Attendance.findOne({ userId, date: startOfTashkentDay() });
  }

  /**
   * Joylashuv manzilini (reverse-geocoding natijasi) yozuvga saqlaydi.
   * Best-effort — davomat oqimidan keyin fon rejimida chaqiriladi.
   */
  async setLocationAddress(
    attendanceId: Types.ObjectId,
    which: 'checkIn' | 'checkOut',
    address: string,
  ): Promise<void> {
    const field = which === 'checkIn' ? 'checkInLocation.address' : 'checkOutLocation.address';
    await Attendance.updateOne({ _id: attendanceId }, { $set: { [field]: address } });
  }

  /**
   * Xodimning faoliyat tarixi — berilgan oraliqdagi kunlik kelish/ketish yozuvlari.
   * Eng yangi kun birinchi. Manzil/joylashuv ma'lumotlari bilan birga qaytaradi.
   */
  async getHistory(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<AttendanceDoc[]> {
    return Attendance.find({ userId, date: { $gte: from, $lte: to } })
      .sort({ date: -1 })
      .populate('storeId', 'name')
      .exec();
  }

  /**
   * Jarimaga rozilik berish.
   */
  async acceptPenalty(attendanceId: Types.ObjectId): Promise<AttendanceDoc | null> {
    return Attendance.findByIdAndUpdate(
      attendanceId,
      {
        penaltyAccepted: true,
        penaltyAcceptedAt: new Date(),
      },
      { new: true },
    );
  }

  /**
   * Kelmaganlikni aniqlash — kun oxirida ishlaydi.
   * Ishlashi kerak bo'lgan (smena belgilangan yoki jadval yo'q) va kelmagan
   * xodimlarni `absent` deb belgilaydi. Dam olish kuni (jadvalda day_off yoki
   * tasdiqlangan dam olish so'rovi) bo'lganlar o'tkazib yuboriladi.
   *
   * @returns belgilangan absent yozuvlar soni
   */
  async markAbsentees(date: Date = startOfTashkentDay()): Promise<{ marked: number }> {
    const day = startOfTashkentDay(date);

    // Do'konga biriktirilgan, ishlashi kutiladigan xodimlar (CEO bundan mustasno).
    const employees = await User.find({
      isActive: true,
      isApproved: true,
      storeId: { $ne: null },
      role: { $in: ['employee', 'manager'] },
    });

    const absencePenalty = await penaltiesService.getAbsencePenalty();
    let marked = 0;

    for (const emp of employees) {
      // Allaqachon kelgan bo'lsa — o'tkazib yuboramiz.
      const existing = await Attendance.findOne({ userId: emp._id, date: day });
      if (existing?.checkIn) continue;

      // Dam olish kunimi? (jadvaldagi day_off yoki tasdiqlangan day_off so'rovi)
      const shift = await schedulesService.getShiftWindow(emp._id, day);
      if (shift.isDayOff) continue;

      // absent deb belgilash (checkIn hali yo'q bo'lsa).
      await Attendance.findOneAndUpdate(
        { userId: emp._id, date: day, checkIn: null },
        {
          $setOnInsert: { userId: emp._id, storeId: emp.storeId, date: day },
          $set: {
            status: 'absent',
            shiftType: shift.shiftType,
            penaltyAmount: absencePenalty,
            penaltyAccepted: false,
            penaltyAcceptedAt: null,
          },
        },
        { upsert: true },
      ).catch((err: unknown) => {
        // Duplicate (boshqa jarayon checkIn qildi) — e'tiborsiz qoldiramiz.
        if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
          return null;
        }
        throw err;
      });
      marked++;
    }

    return { marked };
  }

  /**
   * Foydalanuvchining oxirgi N kunlik statistikasi.
   */
  async getStats(
    userId: Types.ObjectId,
    days = 7,
  ): Promise<{
    totalDays: number;
    presentDays: number;
    lateDays: number;
    leftEarlyDays: number;
    totalPenalty: number;
    acceptedPenalty: number;
    pendingPenalty: number;
  }> {
    const to = startOfTashkentDay();
    const from = addDays(to, -(days - 1));

    const records = await Attendance.find({ userId, date: { $gte: from, $lte: to } });

    const stats = {
      totalDays: records.length,
      presentDays: 0,
      lateDays: 0,
      leftEarlyDays: 0,
      totalPenalty: 0,
      acceptedPenalty: 0,
      pendingPenalty: 0,
    };

    for (const r of records) {
      if (r.status === 'present') stats.presentDays++;
      if (r.status === 'late') stats.lateDays++;
      if (r.status === 'left_early') stats.leftEarlyDays++;
      const amount = r.penaltyAmount ?? 0;
      stats.totalPenalty += amount;
      if (r.penaltyAccepted) stats.acceptedPenalty += amount;
      else stats.pendingPenalty += amount;
    }

    return stats;
  }

  /**
   * CEO kunlik ro'yxati — berilgan kun uchun barcha faol xodimlar holati.
   * Faqat `employee` roli; har bir xodim uchun o'sha kungi attendance yozuvi
   * (bo'lsa) + smena bo'yicha `isDayOff` aniqlanadi. Ism bo'yicha saralangan.
   */
  async getDailyRoster(date: Date): Promise<DailyRoster> {
    const day = startOfTashkentDay(date);

    const employees = await User.find({
      isActive: true,
      isApproved: true,
      role: 'employee',
    })
      .select('firstName lastName storeId division')
      .populate('storeId', 'name')
      .exec();

    const records = await Attendance.find({ date: day });
    const byUser = new Map<string, AttendanceDoc>();
    for (const rec of records) {
      byUser.set(rec.userId.toString(), rec);
    }

    const rows: RosterRow[] = [];
    for (const emp of employees) {
      const rec = byUser.get(emp._id.toString());

      // `isDayOff` har doim smena oynasidan aniqlanadi — `day_off` smenada
      // kelganlar uchun ham (yozuv bo'lsa-da).
      const shift = await schedulesService.getShiftWindow(emp._id, day);
      const isDayOff = shift.isDayOff;

      const store = emp.storeId as unknown as { name?: string } | null;
      const storeName = store && typeof store.name === 'string' ? store.name : null;

      let status: RosterStatus;
      if (rec) {
        status = rec.status as RosterStatus;
      } else if (isDayOff) {
        status = 'day_off';
      } else {
        status = 'not_checked_in';
      }

      rows.push({
        userId: emp._id.toString(),
        name: `${emp.lastName ?? ''} ${emp.firstName}`.trim(),
        storeName,
        division: emp.division ?? null,
        shiftType: rec?.shiftType ?? shift.shiftType ?? null,
        checkIn: rec?.checkIn ?? null,
        checkOut: rec?.checkOut ?? null,
        lateMinutes: rec?.lateMinutes ?? 0,
        earlyLeaveMinutes: rec?.earlyLeaveMinutes ?? 0,
        status,
        penaltyAmount: rec?.penaltyAmount ?? 0,
        isDayOff,
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));

    const summary: RosterSummary = {
      totalEmployees: rows.length,
      present: 0,
      absent: 0,
      late: 0,
      leftEarly: 0,
      fined: 0,
      onDayOff: 0,
      totalPenalty: 0,
    };
    for (const row of rows) {
      if (row.checkIn) summary.present++;
      if (row.status === 'absent') summary.absent++;
      if (row.status === 'late') summary.late++;
      if (row.status === 'left_early') summary.leftEarly++;
      if (row.penaltyAmount > 0) summary.fined++;
      if (row.isDayOff) summary.onDayOff++;
      summary.totalPenalty += row.penaltyAmount;
    }

    return { date: formatApiDate(day), summary, rows };
  }

  /**
   * CEO uchun bitta xodimning davomat tarixi — oraliqdagi mavjud Attendance
   * yozuvlari (eng yangi birinchi) + jami statistikasi. Yozuv yo'q kunlar
   * ko'rsatilmaydi; `isDayOff` yozuvning `shiftType === 'day_off'` dan olinadi.
   */
  async getEmployeeHistory(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<EmployeeHistory> {
    const fromDay = startOfTashkentDay(from);
    const toDay = startOfTashkentDay(to);

    const user = await User.findById(userId)
      .select('firstName lastName storeId division')
      .populate('storeId', 'name')
      .exec();

    const store = (user?.storeId ?? null) as unknown as { name?: string } | null;
    const storeName = store && typeof store.name === 'string' ? store.name : null;

    const records = await Attendance.find({
      userId,
      date: { $gte: fromDay, $lte: toDay },
    })
      .sort({ date: -1 })
      .exec();

    const days: EmployeeHistoryDay[] = records.map((rec) => ({
      date: rec.date,
      checkIn: rec.checkIn ?? null,
      checkOut: rec.checkOut ?? null,
      status: rec.status,
      lateMinutes: rec.lateMinutes ?? 0,
      earlyLeaveMinutes: rec.earlyLeaveMinutes ?? 0,
      penaltyAmount: rec.penaltyAmount ?? 0,
      shiftType: rec.shiftType ?? null,
      isDayOff: rec.shiftType === 'day_off',
    }));

    const totals = {
      present: 0,
      absent: 0,
      late: 0,
      leftEarly: 0,
      dayOff: 0,
      totalPenalty: 0,
    };
    for (const d of days) {
      if (d.status === 'present') totals.present++;
      if (d.status === 'absent') totals.absent++;
      if (d.status === 'late') totals.late++;
      if (d.status === 'left_early') totals.leftEarly++;
      if (d.isDayOff) totals.dayOff++;
      totals.totalPenalty += d.penaltyAmount;
    }

    return {
      employee: {
        id: userId.toString(),
        name: user ? `${user.lastName ?? ''} ${user.firstName}`.trim() : '',
        storeName,
        division: user?.division ?? null,
      },
      days,
      totals,
    };
  }
}

export const attendancesService = new AttendancesService();

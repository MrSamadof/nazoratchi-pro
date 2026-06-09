import { Router, type Request, type Response } from 'express';
import { Types } from 'mongoose';
import { z, ZodError } from 'zod';
import { connectDatabase } from '../../src/core/database/connection.js';
import { attendancesService, AttendanceError } from '../../src/modules/attendances/attendances.service.js';
import { storesService } from '../../src/modules/stores/stores.service.js';
import { schedulesService } from '../../src/modules/schedules/schedules.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import { loadSession, requireAuth } from '../middleware/auth.js';
import { logger } from '../../src/core/logger/logger.js';
import { reverseGeocode } from '../../src/core/utils/geocode.js';
import { startOfTashkentDay, addDays } from '../../src/core/utils/date.js';

/**
 * Fon rejimida joylashuv manzilini aniqlab yozuvga saqlaydi (fire-and-forget).
 * Davomat javobini kechiktirmaydi; xato bo'lsa jimgina o'tkazib yuboradi.
 */
function resolveAddress(
  attendanceId: Types.ObjectId,
  which: 'checkIn' | 'checkOut',
  lat: number | null | undefined,
  lng: number | null | undefined,
): void {
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  void reverseGeocode(lat, lng)
    .then((addr) =>
      addr ? attendancesService.setLocationAddress(attendanceId, which, addr) : undefined,
    )
    .catch((err) => logger.warn({ err }, 'resolveAddress'));
}

export const attendanceRouter = Router();
attendanceRouter.use(loadSession);

const checkInDto = z
  .object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    accuracy: z.number().min(0).optional().nullable(),
    source: z.enum(['store', 'other']).default('store'),
    note: z.string().max(500).optional(),
  })
  .optional();

const checkOutDto = z
  .object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    accuracy: z.number().min(0).optional().nullable(),
    source: z.enum(['store', 'other']).default('store'),
    note: z.string().max(500).optional(),
  })
  .optional();

attendanceRouter.get('/today', requireAuth, async (req: Request, res: Response) => {
  await connectDatabase();
  const att = await attendancesService.getTodayAttendance(req.auth!.user._id);
  res.json({
    ok: true,
    attendance: att
      ? {
          id: att._id.toString(),
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          lateMinutes: att.lateMinutes,
          earlyLeaveMinutes: att.earlyLeaveMinutes,
          penaltyAmount: att.penaltyAmount,
          penaltyAccepted: att.penaltyAccepted,
          status: att.status,
          checkInOffSite: att.checkInOffSite ?? false,
          checkOutOffSite: att.checkOutOffSite ?? false,
          checkInSource: att.checkInSource ?? 'store',
          checkInNote: att.checkInNote ?? '',
          checkOutSource: att.checkOutSource ?? 'store',
          checkOutNote: att.checkOutNote ?? '',
          checkInDistanceMeters: att.checkInLocation?.distanceMeters ?? null,
          checkOutDistanceMeters: att.checkOutLocation?.distanceMeters ?? null,
          checkInLat: att.checkInLocation?.lat ?? null,
          checkInLng: att.checkInLocation?.lng ?? null,
          checkInAddress: att.checkInLocation?.address ?? null,
          checkOutLat: att.checkOutLocation?.lat ?? null,
          checkOutLng: att.checkOutLocation?.lng ?? null,
          checkOutAddress: att.checkOutLocation?.address ?? null,
        }
      : null,
  });
});

attendanceRouter.post('/check-in', requireAuth, async (req: Request, res: Response) => {
  const sess = req.auth!;
  try {
    const body = checkInDto.parse(req.body && Object.keys(req.body).length ? req.body : undefined);
    await connectDatabase();
    // Bugungi ish joyi: jadvalda biriktirilgan joy (ofis/do'kon) bo'lsa o'sha,
    // aks holda xodimning doimiy do'koni.
    const dayStoreId = (await schedulesService.getDayStoreId(sess.user._id)) ?? sess.user.storeId;
    if (!dayStoreId) {
      res.status(400).json({ ok: false, error: "Ish joyi tayinlanmagan" });
      return;
    }
    const store = await storesService.findById(dayStoreId);
    if (!store) {
      res.status(400).json({ ok: false, error: "Ish joyi topilmadi" });
      return;
    }
    // GPS ixtiyoriy — source/note doimo uzatiladi (joylashuv bo'lmasa ham).
    const location = body
      ? {
          lat: typeof body.lat === 'number' ? body.lat : undefined,
          lng: typeof body.lng === 'number' ? body.lng : undefined,
          accuracy: body.accuracy ?? null,
          source: body.source,
          note: body.note,
        }
      : undefined;
    const result = await attendancesService.checkIn(sess.user._id, store, location);
    await auditLogsService.log({
      userId: sess.user._id,
      action: 'attendance.check_in',
      targetType: 'Attendance',
      targetId: result.attendance._id,
      meta: {
        lateMinutes: result.lateMinutes,
        penalty: result.penaltyAmount,
        offSite: result.offSite,
        distanceMeters: result.distanceMeters,
        source: result.source,
      },
    });
    res.json({
      ok: true,
      isLate: result.isLate,
      lateMinutes: result.lateMinutes,
      penaltyAmount: result.penaltyAmount,
      approved: result.approved,
      checkIn: result.attendance.checkIn,
      offSite: result.offSite,
      distanceMeters: result.distanceMeters,
      source: result.source,
    });
    // Javobdan keyin fon rejimida manzilni aniqlaymiz (oqimni bloklamaydi).
    resolveAddress(
      result.attendance._id,
      'checkIn',
      result.attendance.checkInLocation?.lat,
      result.attendance.checkInLocation?.lng,
    );
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: 'Joylashuv ma\'lumotlari noto\'g\'ri' });
      return;
    }
    if (err instanceof AttendanceError) {
      res.status(400).json({ ok: false, error: err.message, code: err.code });
      return;
    }
    logger.error({ err }, 'check-in');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

attendanceRouter.post('/check-out', requireAuth, async (req: Request, res: Response) => {
  const sess = req.auth!;
  try {
    const body = checkOutDto.parse(req.body && Object.keys(req.body).length ? req.body : undefined);
    await connectDatabase();
    // Bugungi ish joyi: jadvalda biriktirilgan joy (ofis/do'kon) bo'lsa o'sha,
    // aks holda xodimning doimiy do'koni.
    const dayStoreId = (await schedulesService.getDayStoreId(sess.user._id)) ?? sess.user.storeId;
    if (!dayStoreId) {
      res.status(400).json({ ok: false, error: "Ish joyi tayinlanmagan" });
      return;
    }
    const store = await storesService.findById(dayStoreId);
    if (!store) {
      res.status(400).json({ ok: false, error: "Ish joyi topilmadi" });
      return;
    }
    // Faqat lat/lng to'la bo'lsa location uzatamiz
    const location =
      body && typeof body.lat === 'number' && typeof body.lng === 'number'
        ? {
            lat: body.lat,
            lng: body.lng,
            accuracy: body.accuracy ?? null,
            source: body.source,
            note: body.note,
          }
        : body
          ? { lat: 0, lng: 0, source: body.source, note: body.note }
          : undefined;
    // GPS bo'lmasa lat/lng=0 yuborilishi noto'g'ri — undefined qilamiz
    const finalLocation =
      location && (location.lat !== 0 || location.lng !== 0) ? location : undefined;
    const result = await attendancesService.checkOut(sess.user._id, store, finalLocation);
    await auditLogsService.log({
      userId: sess.user._id,
      action: 'attendance.check_out',
      targetType: 'Attendance',
      targetId: result.attendance._id,
      meta: {
        earlyLeaveMinutes: result.earlyLeaveMinutes,
        penalty: result.penaltyAmount,
        workedMinutes: result.workedMinutes,
        offSite: result.offSite,
        distanceMeters: result.distanceMeters,
        source: result.source,
      },
    });
    res.json({
      ok: true,
      isEarly: result.isEarly,
      earlyLeaveMinutes: result.earlyLeaveMinutes,
      penaltyAmount: result.penaltyAmount,
      approved: result.approved,
      workedMinutes: result.workedMinutes,
      checkOut: result.attendance.checkOut,
      offSite: result.offSite,
      distanceMeters: result.distanceMeters,
      source: result.source,
    });
    // Javobdan keyin fon rejimida manzilni aniqlaymiz (oqimni bloklamaydi).
    resolveAddress(
      result.attendance._id,
      'checkOut',
      result.attendance.checkOutLocation?.lat,
      result.attendance.checkOutLocation?.lng,
    );
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ ok: false, error: 'Joylashuv ma\'lumotlari noto\'g\'ri' });
      return;
    }
    if (err instanceof AttendanceError) {
      res.status(400).json({ ok: false, error: err.message, code: err.code });
      return;
    }
    logger.error({ err }, 'check-out');
    res.status(500).json({ ok: false, error: 'Texnik xato' });
  }
});

attendanceRouter.get('/stats', requireAuth, async (req: Request, res: Response) => {
  const days = Math.min(90, Math.max(1, parseInt(String(req.query.days ?? '7'), 10)));
  await connectDatabase();
  const stats = await attendancesService.getStats(req.auth!.user._id, days);
  res.json({ ok: true, days, ...stats });
});

// Xodimning faoliyat tarixi — kun/hafta/oy bo'yicha kelish/ketish yozuvlari (manzil bilan).
attendanceRouter.get('/history', requireAuth, async (req: Request, res: Response) => {
  const days = Math.min(92, Math.max(1, parseInt(String(req.query.days ?? '7'), 10)));
  await connectDatabase();
  const to = startOfTashkentDay();
  const from = addDays(to, -(days - 1));
  const records = await attendancesService.getHistory(req.auth!.user._id, from, to);

  const mapLoc = (
    loc:
      | { lat?: number | null; lng?: number | null; distanceMeters?: number | null; address?: string | null }
      | null
      | undefined,
    offSite: boolean,
    source: 'store' | 'other',
    note: string,
  ) => {
    const hasGps = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
    if (!hasGps && source !== 'other' && !note) return null;
    return {
      lat: hasGps ? loc!.lat : null,
      lng: hasGps ? loc!.lng : null,
      distanceMeters: loc?.distanceMeters ?? null,
      address: loc?.address ?? null,
      offSite,
      source,
      note,
    };
  };

  const summary = { present: 0, late: 0, leftEarly: 0, absent: 0, totalPenalty: 0, workedDays: 0 };

  const items = records.map((r) => {
    if (r.status === 'present') summary.present++;
    else if (r.status === 'late') summary.late++;
    else if (r.status === 'left_early') summary.leftEarly++;
    else if (r.status === 'absent') summary.absent++;
    if (r.checkIn) summary.workedDays++;
    summary.totalPenalty += r.penaltyAmount ?? 0;

    const store = r.storeId as unknown as { _id?: unknown; name?: string } | null;
    return {
      id: r._id.toString(),
      date: r.date,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      lateMinutes: r.lateMinutes ?? 0,
      earlyLeaveMinutes: r.earlyLeaveMinutes ?? 0,
      penaltyAmount: r.penaltyAmount ?? 0,
      penaltyAccepted: r.penaltyAccepted ?? false,
      store: store && store.name ? { name: store.name } : null,
      checkInLoc: mapLoc(
        r.checkInLocation,
        r.checkInOffSite ?? false,
        (r.checkInSource as 'store' | 'other') ?? 'store',
        r.checkInNote ?? '',
      ),
      checkOutLoc: mapLoc(
        r.checkOutLocation,
        r.checkOutOffSite ?? false,
        (r.checkOutSource as 'store' | 'other') ?? 'store',
        r.checkOutNote ?? '',
      ),
    };
  });

  res.json({ ok: true, days, summary, records: items });
});

attendanceRouter.post('/accept-penalty', requireAuth, async (req: Request, res: Response) => {
  const sess = req.auth!;
  await connectDatabase();
  const today = await attendancesService.getTodayAttendance(sess.user._id);
  if (!today) {
    res.status(404).json({ ok: false, error: "Bugungi yozuv topilmadi" });
    return;
  }
  if ((today.penaltyAmount ?? 0) <= 0) {
    res.status(400).json({ ok: false, error: "Jarima yo'q" });
    return;
  }
  await attendancesService.acceptPenalty(today._id as Types.ObjectId);
  await auditLogsService.log({
    userId: sess.user._id,
    action: 'attendance.penalty_accepted',
    targetType: 'Attendance',
    targetId: today._id as Types.ObjectId,
    meta: { amount: today.penaltyAmount },
  });
  res.json({ ok: true });
});

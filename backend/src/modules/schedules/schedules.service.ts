import type { Types } from 'mongoose';
import { Schedule, type ScheduleDoc, type ScheduleSource } from './schedules.model.js';
import { User } from '../users/users.model.js';
import { FIXED_SHIFTS, type ShiftType } from '../../core/config/constants.js';
import {
  appSettingsService,
  type ShiftTemplates,
} from '../app-settings/app-settings.service.js';
import { startOfTashkentDay, addDays } from '../../core/utils/date.js';

export interface ShiftWindow {
  /** O'sha kunga alohida jadval (Schedule) yozuvi bormi. */
  hasSchedule: boolean;
  /**
   * Smena shu kunni boshqaradimi (jadval YOKI xodimning doimiy smenasi).
   * false bo'lsa — chaqiruvchi do'kon standart ish vaqtiga tushadi.
   */
  resolved: boolean;
  shiftType: ShiftType | null;
  /** "HH:mm" yoki null (flexible/day_off — belgilangan boshlanish yo'q). */
  startTime: string | null;
  endTime: string | null;
  /** Belgilangan vaqtli smena — kech kelish/erta ketish hisoblanadi. */
  fixed: boolean;
  isDayOff: boolean;
}

export class SchedulesService {
  /**
   * Berilgan smena turi uchun standart boshlanish/tugash vaqti.
   * Saqlangan startTime/endTime bo'sh bo'lsa shu qiymatlar ishlatiladi.
   */
  private resolveTimes(
    shiftType: ShiftType,
    templates: ShiftTemplates,
    startTime?: string,
    endTime?: string,
  ): { startTime: string | null; endTime: string | null } {
    if (shiftType === 'day_off') return { startTime: null, endTime: null };
    if (shiftType === 'custom') {
      return { startTime: startTime || null, endTime: endTime || null };
    }
    // morning | evening | flexible — shablondan (DB yoki default)
    const def = templates[shiftType];
    return {
      startTime: startTime || def.startTime,
      endTime: endTime || def.endTime,
    };
  }

  /** shiftType (+ ixtiyoriy maxsus vaqt) dan to'liq smena oynasini quradi. */
  private buildWindow(
    shiftType: ShiftType,
    hasSchedule: boolean,
    templates: ShiftTemplates,
    startTime?: string,
    endTime?: string,
  ): ShiftWindow {
    const isDayOff = shiftType === 'day_off';
    const fixed = FIXED_SHIFTS.includes(shiftType);
    const t = this.resolveTimes(shiftType, templates, startTime, endTime);
    return {
      hasSchedule,
      resolved: true,
      shiftType,
      startTime: isDayOff ? null : t.startTime,
      endTime: isDayOff ? null : t.endTime,
      fixed,
      isDayOff,
    };
  }

  /**
   * Xodimning o'sha kungi smena oynasi — attendance kech kelish/erta ketishni
   * shu asosda hisoblaydi. Ustuvorlik: kunlik jadval > xodimning doimiy smenasi >
   * (hech narsa bo'lmasa) do'kon standart ish vaqti.
   */
  async getShiftWindow(
    userId: Types.ObjectId,
    date: Date = startOfTashkentDay(),
  ): Promise<ShiftWindow> {
    const day = startOfTashkentDay(date);
    const templates = await appSettingsService.getShiftsConfig();
    const sched = await Schedule.findOne({ userId, date: day });

    // 1) O'sha kunga alohida jadval yozuvi bor — eng yuqori ustuvorlik.
    if (sched) {
      return this.buildWindow(
        sched.shiftType as ShiftType,
        true,
        templates,
        sched.startTime,
        sched.endTime,
      );
    }

    // 2) Jadval yo'q — xodimning doimiy (default) smenasiga tushamiz.
    const user = await User.findById(userId).select(
      'defaultShiftType defaultShiftStartTime defaultShiftEndTime',
    );
    const def = user?.defaultShiftType as ShiftType | null | undefined;
    if (def) {
      return this.buildWindow(
        def,
        false,
        templates,
        user?.defaultShiftStartTime ?? undefined,
        user?.defaultShiftEndTime ?? undefined,
      );
    }

    // 3) Hech narsa yo'q — chaqiruvchi do'kon standart vaqtini ishlatadi.
    return {
      hasSchedule: false,
      resolved: false,
      shiftType: null,
      startTime: null,
      endTime: null,
      fixed: false,
      isDayOff: false,
    };
  }

  /**
   * Bir xodimning bir kunlik smenasini belgilash (upsert).
   */
  async setShift(params: {
    userId: Types.ObjectId | string;
    storeId: Types.ObjectId | string;
    date: Date;
    shiftType: ShiftType;
    source?: ScheduleSource;
    note?: string;
    assignedBy?: Types.ObjectId | string | null;
    startTime?: string;
    endTime?: string;
  }): Promise<ScheduleDoc> {
    const day = startOfTashkentDay(params.date);
    const templates = await appSettingsService.getShiftsConfig();
    const { startTime, endTime } = this.resolveTimes(
      params.shiftType,
      templates,
      params.startTime,
      params.endTime,
    );

    return Schedule.findOneAndUpdate(
      { userId: params.userId, date: day },
      {
        $set: {
          storeId: params.storeId,
          shiftType: params.shiftType,
          startTime: startTime ?? '',
          endTime: endTime ?? '',
          source: params.source ?? 'scheduled',
          note: params.note ?? '',
          assignedBy: params.assignedBy ?? null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  /**
   * Do'konning bir haftalik (7 kun) jadvali. weekStart — hafta boshlanish kuni.
   */
  async getWeek(
    storeId: Types.ObjectId | string,
    weekStart: Date,
  ): Promise<ScheduleDoc[]> {
    const start = startOfTashkentDay(weekStart);
    const end = addDays(start, 7);
    return Schedule.find({
      storeId,
      date: { $gte: start, $lt: end },
    }).sort({ date: 1 });
  }

  /**
   * Xodimning o'sha kungi ish joyi (do'kon/ofis) — keldim-ketdim shu joyga
   * bog'lanadi. Jadvalda boshqa joyga biriktirilgan bo'lsa (masalan bugun ofis,
   * ertaga do'kon) shu joy qaytadi. Jadval bo'lmasa null — chaqiruvchi xodimning
   * doimiy do'koniga (user.storeId) tushadi.
   */
  async getDayStoreId(
    userId: Types.ObjectId | string,
    date: Date = startOfTashkentDay(),
  ): Promise<string | null> {
    const day = startOfTashkentDay(date);
    const sched = await Schedule.findOne({ userId, date: day }).select('storeId');
    return sched?.storeId ? sched.storeId.toString() : null;
  }

  /**
   * Bir kunlik barcha smenalar (kelmaganlikni aniqlash jobi uchun).
   */
  async getByDate(date: Date = startOfTashkentDay()): Promise<ScheduleDoc[]> {
    const day = startOfTashkentDay(date);
    return Schedule.find({ date: day });
  }

  /**
   * Ikki xodimning o'sha kungi smenasini almashtirish (masalan ertalabgi xodim
   * tovar olgani ketib, kechki xodim ertalabga o'tadi).
   * Smenasi belgilanmagan xodim uchun day_off deb hisoblanadi.
   */
  async swap(
    userA: Types.ObjectId | string,
    userB: Types.ObjectId | string,
    date: Date,
    assignedBy?: Types.ObjectId | string | null,
  ): Promise<{ a: ScheduleDoc; b: ScheduleDoc }> {
    const day = startOfTashkentDay(date);
    const [schedA, schedB] = await Promise.all([
      Schedule.findOne({ userId: userA, date: day }),
      Schedule.findOne({ userId: userB, date: day }),
    ]);

    const shiftA = (schedA?.shiftType ?? 'day_off') as ShiftType;
    const shiftB = (schedB?.shiftType ?? 'day_off') as ShiftType;
    const storeA = schedA?.storeId ?? schedB?.storeId;
    const storeB = schedB?.storeId ?? schedA?.storeId;

    if (!storeA || !storeB) {
      throw new Error('Almashtirish uchun kamida bitta smena yozuvi kerak');
    }

    const [a, b] = await Promise.all([
      this.setShift({
        userId: userA,
        storeId: storeA,
        date: day,
        shiftType: shiftB,
        source: 'swap',
        assignedBy,
      }),
      this.setShift({
        userId: userB,
        storeId: storeB,
        date: day,
        shiftType: shiftA,
        source: 'swap',
        assignedBy,
      }),
    ]);

    return { a, b };
  }
}

export const schedulesService = new SchedulesService();

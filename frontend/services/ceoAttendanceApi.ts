import { baseApi } from './baseApi';

/**
 * CEO davomat nazorati — RTK Query servisi.
 *
 * Backend kontrakti (spec §3.3, "API kontrakt xulosasi"):
 *   GET /api/ceo/attendance?date=YYYY-MM-DD
 *   GET /api/ceo/attendance/:userId?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * `checkIn`/`checkOut` — ISO string yoki null (backend `Date`larni ISO qiladi).
 */

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'left_early'
  | 'absent'
  | 'day_off'
  | 'not_checked_in';

export interface RosterRow {
  userId: string;
  name: string;
  storeName: string | null;
  division: string | null;
  shiftType: string | null;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: AttendanceStatus;
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
  date: string;
  summary: RosterSummary;
  rows: RosterRow[];
}

export interface EmployeeAttendanceDay {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  penaltyAmount: number;
  shiftType: string | null;
  isDayOff: boolean;
}

export interface EmployeeAttendanceInfo {
  id: string;
  name: string;
  storeName: string | null;
  division: string | null;
}

export interface EmployeeAttendanceTotals {
  present: number;
  absent: number;
  late: number;
  leftEarly: number;
  dayOff: number;
  totalPenalty: number;
}

export interface EmployeeAttendanceHistory {
  employee: EmployeeAttendanceInfo;
  days: EmployeeAttendanceDay[];
  totals: EmployeeAttendanceTotals;
}

interface DailyRosterResponse extends DailyRoster {
  ok: boolean;
}

interface EmployeeHistoryResponse extends EmployeeAttendanceHistory {
  ok: boolean;
}

export const ceoAttendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCeoAttendanceDay: build.query<DailyRoster, { date?: string } | void>({
      query: (arg) => {
        const date = arg && 'date' in arg ? arg.date : undefined;
        return date ? `/ceo/attendance?date=${date}` : '/ceo/attendance';
      },
      transformResponse: (res: DailyRosterResponse): DailyRoster => ({
        date: res.date,
        summary: res.summary,
        rows: res.rows ?? [],
      }),
      providesTags: ['Attendance'],
    }),

    getCeoEmployeeAttendance: build.query<
      EmployeeAttendanceHistory,
      { userId: string; from?: string; to?: string }
    >({
      query: ({ userId, from, to }) => {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const qs = params.toString();
        return `/ceo/attendance/${userId}${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (res: EmployeeHistoryResponse): EmployeeAttendanceHistory => ({
        employee: res.employee,
        days: res.days ?? [],
        totals: res.totals,
      }),
      providesTags: ['Attendance'],
    }),
  }),
});

export const { useGetCeoAttendanceDayQuery, useGetCeoEmployeeAttendanceQuery } = ceoAttendanceApi;

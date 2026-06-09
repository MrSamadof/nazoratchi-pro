import { baseApi } from './baseApi';
import type { Division, Role, ShiftType } from '@/shared/types';

export interface ScheduleEntry {
  id: string;
  userId: string;
  storeId: string;
  /** yyyy-MM-dd (Tashkent) */
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  source: 'scheduled' | 'swap' | 'requested';
  note: string;
}

export interface ScheduleEmployee {
  id: string;
  firstName: string;
  lastName: string;
  division: Division | null;
  role: Role;
}

export interface WeekScheduleResponse {
  ok: boolean;
  weekStart: string;
  employees: ScheduleEmployee[];
  schedules: ScheduleEntry[];
}

export interface SetShiftArgs {
  userId: string;
  storeId: string;
  date: string;
  shiftType: ShiftType;
  note?: string;
}

export interface SwapShiftArgs {
  userA: string;
  userB: string;
  date: string;
  /** Kesh invalidatsiyasi uchun (so'rovga ketmaydi). */
  storeId: string;
  weekStart: string;
}

export const schedulesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWeekSchedule: build.query<WeekScheduleResponse, { storeId: string; weekStart: string }>({
      query: ({ storeId, weekStart }) =>
        `/schedules/week?storeId=${storeId}&weekStart=${weekStart}`,
      // Har do'kon+hafta uchun alohida kesh yozuvi.
      providesTags: (_res, _err, arg) => [
        { type: 'Schedule', id: `${arg.storeId}:${arg.weekStart}` },
      ],
    }),

    setShift: build.mutation<{ ok: boolean; schedule: ScheduleEntry }, SetShiftArgs & { weekStart: string }>({
      query: ({ weekStart: _weekStart, ...body }) => ({
        url: '/schedules/shift',
        method: 'POST',
        body,
      }),
      // Optimistik update — grid katagi darhol yangilanadi, server javobini kutmaydi.
      async onQueryStarted({ userId, date, shiftType, storeId, weekStart }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          schedulesApi.util.updateQueryData('getWeekSchedule', { storeId, weekStart }, (draft) => {
            const existing = draft.schedules.find((s) => s.userId === userId && s.date === date);
            if (existing) {
              existing.shiftType = shiftType;
            } else {
              draft.schedules.push({
                id: `optimistic-${userId}-${date}`,
                userId,
                storeId,
                date,
                shiftType,
                startTime: '',
                endTime: '',
                source: 'scheduled',
                note: '',
              });
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Schedule', id: `${arg.storeId}:${arg.weekStart}` },
      ],
    }),

    swapShift: build.mutation<{ ok: boolean }, SwapShiftArgs>({
      query: ({ userA, userB, date }) => ({
        url: '/schedules/swap',
        method: 'POST',
        body: { userA, userB, date },
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Schedule', id: `${arg.storeId}:${arg.weekStart}` },
      ],
    }),
  }),
});

export const {
  useGetWeekScheduleQuery,
  useSetShiftMutation,
  useSwapShiftMutation,
} = schedulesApi;

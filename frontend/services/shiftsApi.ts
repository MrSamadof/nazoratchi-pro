import { baseApi } from './baseApi';

export interface ShiftTemplate {
  label: string;
  startTime: string | null;
  endTime: string | null;
}
export type ShiftTemplates = Record<'morning' | 'evening' | 'flexible', ShiftTemplate>;

export const shiftsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getShiftsConfig: build.query<ShiftTemplates, void>({
      query: () => '/admin/shifts-config',
      transformResponse: (res: { ok: boolean; shifts: ShiftTemplates }) => res.shifts,
      providesTags: [{ type: 'ShiftConfig', id: 'GLOBAL' }],
    }),
    updateShiftsConfig: build.mutation<
      { ok: boolean; shifts: ShiftTemplates; error?: string },
      Partial<ShiftTemplates>
    >({
      query: (body) => ({ url: '/admin/shifts-config', method: 'PUT', body }),
      invalidatesTags: [{ type: 'ShiftConfig', id: 'GLOBAL' }],
    }),
  }),
});

export const { useGetShiftsConfigQuery, useUpdateShiftsConfigMutation } = shiftsApi;

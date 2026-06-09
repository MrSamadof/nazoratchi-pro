import { baseApi } from './baseApi';

export type PenaltyType = 'late_arrival' | 'early_leave' | 'absence' | 'other';

export interface ApiPenaltyRule {
  id: string;
  name: string;
  type: PenaltyType;
  minMinutes: number;
  maxMinutes: number | null;
  amount: number;
  isActive: boolean;
  notes: string;
}

export interface PenaltyRuleBody {
  name: string;
  type: PenaltyType;
  minMinutes: number;
  maxMinutes: number | null;
  amount: number;
  isActive: boolean;
}

export const penaltyRulesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPenaltyRules: build.query<ApiPenaltyRule[], void>({
      query: () => '/ceo/penalty-rules',
      transformResponse: (res: { ok: boolean; rules: ApiPenaltyRule[] }) => res.rules ?? [],
      providesTags: [{ type: 'PenaltyRule', id: 'LIST' }],
    }),

    createPenaltyRule: build.mutation<{ ok: boolean; error?: string }, PenaltyRuleBody>({
      query: (body) => ({ url: '/ceo/penalty-rules', method: 'POST', body }),
      invalidatesTags: [{ type: 'PenaltyRule', id: 'LIST' }],
    }),

    updatePenaltyRule: build.mutation<
      { ok: boolean; error?: string },
      { id: string; body: Partial<PenaltyRuleBody> }
    >({
      query: ({ id, body }) => ({ url: `/ceo/penalty-rules/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'PenaltyRule', id: 'LIST' }],
    }),

    deletePenaltyRule: build.mutation<{ ok: boolean; error?: string }, string>({
      query: (id) => ({ url: `/ceo/penalty-rules/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'PenaltyRule', id: 'LIST' }],
    }),
  }),
});

export const {
  useListPenaltyRulesQuery,
  useCreatePenaltyRuleMutation,
  useUpdatePenaltyRuleMutation,
  useDeletePenaltyRuleMutation,
} = penaltyRulesApi;

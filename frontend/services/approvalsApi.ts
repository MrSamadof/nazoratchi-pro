import { baseApi } from './baseApi';
import type { ApprovalStatus, ApprovalType } from '@/shared/types';

export interface ApiApproval {
  id: string;
  type: ApprovalType;
  requestedDate: string;
  requestedTime: string;
  reason: string;
  status: ApprovalStatus;
  adminComment: string;
  decidedAt: string | null;
  createdAt: string;
}

export interface CreateApprovalBody {
  type: ApprovalType;
  requestedDate: string;
  requestedTime?: string;
  reason: string;
}

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listApprovals: build.query<ApiApproval[], void>({
      query: () => '/approvals',
      transformResponse: (res: { ok: boolean; approvals: ApiApproval[] }) => res.approvals ?? [],
      providesTags: [{ type: 'Approval', id: 'LIST' }],
    }),

    createApproval: build.mutation<{ ok: boolean; error?: string }, CreateApprovalBody>({
      query: (body) => ({ url: '/approvals', method: 'POST', body }),
      invalidatesTags: [{ type: 'Approval', id: 'LIST' }],
    }),
  }),
});

export const { useListApprovalsQuery, useCreateApprovalMutation } = approvalsApi;

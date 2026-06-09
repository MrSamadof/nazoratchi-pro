import { baseApi } from './baseApi';
import type { Division, RewardStatus, RewardType } from '@/shared/types';

export interface ApiReward {
  id: string;
  recipientName: string | null;
  storeName: string | null;
  requestedByName: string | null;
  division: Division | null;
  amount: number;
  reason: string;
  type: RewardType;
  status: RewardStatus;
  initiatorRole: 'employee' | 'manager' | 'system';
  adminComment: string;
  date: string;
  decidedAt: string | null;
  createdAt: string;
}

export interface ColleagueOption {
  id: string;
  fullName: string;
  storeName: string | null;
  division: Division | null;
  role: 'employee' | 'manager' | 'ceo';
}

export interface CreateRewardBody {
  // Xodim faqat `reason` yuboradi; rahbar/CEO `recipientId` + `amount` ham beradi.
  recipientId?: string;
  amount?: number;
  reason: string;
}

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRewards: build.query<ApiReward[], { status?: RewardStatus } | void>({
      query: (arg) => (arg?.status ? `/rewards?status=${arg.status}` : '/rewards'),
      transformResponse: (res: { ok: boolean; rewards: ApiReward[] }) => res.rewards ?? [],
      providesTags: [{ type: 'Reward', id: 'LIST' }],
    }),

    listMyRewards: build.query<ApiReward[], void>({
      query: () => '/rewards/mine',
      transformResponse: (res: { ok: boolean; rewards: ApiReward[] }) => res.rewards ?? [],
      providesTags: [{ type: 'Reward', id: 'MINE' }],
    }),

    listColleagues: build.query<ColleagueOption[], void>({
      query: () => '/users',
      transformResponse: (res: { ok: boolean; users: ColleagueOption[] }) => res.users ?? [],
      providesTags: [{ type: 'User', id: 'COLLEAGUES' }],
    }),

    createReward: build.mutation<{ ok: boolean; error?: string }, CreateRewardBody>({
      query: (body) => ({ url: '/rewards', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Reward', id: 'LIST' },
        { type: 'Reward', id: 'MINE' },
      ],
    }),

    decideReward: build.mutation<
      { ok: boolean; error?: string },
      { id: string; decision: 'approve' | 'reject'; comment?: string; amount?: number }
    >({
      query: ({ id, decision, comment, amount }) => ({
        url: `/rewards/${id}/decide`,
        method: 'POST',
        body: { decision, comment, amount },
      }),
      invalidatesTags: [
        { type: 'Reward', id: 'LIST' },
        { type: 'Reward', id: 'MINE' },
      ],
    }),
  }),
});

export const {
  useListRewardsQuery,
  useListMyRewardsQuery,
  useListColleaguesQuery,
  useCreateRewardMutation,
  useDecideRewardMutation,
} = rewardsApi;

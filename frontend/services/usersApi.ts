import { baseApi } from './baseApi';
import type { Division, Role, ShiftType } from '@/shared/types';

export interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  division: Division | null;
  defaultShiftType: ShiftType | null;
  defaultShiftStartTime: string | null;
  defaultShiftEndTime: string | null;
  isActive: boolean;
  isApproved: boolean;
  storeId: string | null;
  storeName: string | null;
  telegramId: number | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserBody {
  firstName: string;
  lastName?: string;
  phone: string;
  password: string;
  role: Role;
  storeId?: string | null;
  division?: Division | null;
  defaultShiftType?: ShiftType | null;
  defaultShiftStartTime?: string | null;
  defaultShiftEndTime?: string | null;
  isApproved?: boolean;
  isActive?: boolean;
}

export type UpdateUserBody = Partial<Omit<CreateUserBody, 'password'>>;

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listUsers: build.query<
      ApiUser[],
      { limit?: number; includeDeleted?: boolean; scope?: 'ceo' | 'admin' } | void
    >({
      query: (arg) => {
        const scope = arg?.scope ?? 'ceo';
        if (scope === 'admin') {
          const includeDeleted = arg?.includeDeleted ? '?includeDeleted=true' : '';
          return `/admin/users${includeDeleted}`;
        }
        const limit = arg?.limit ?? 100;
        const includeDeleted = arg?.includeDeleted ? '&includeDeleted=true' : '';
        return `/ceo/users?limit=${limit}${includeDeleted}`;
      },
      transformResponse: (res: { ok: boolean; users: ApiUser[] }) => res.users ?? [],
      providesTags: (users) =>
        users
          ? [...users.map((u) => ({ type: 'User' as const, id: u.id })), { type: 'User' as const, id: 'LIST' }]
          : [{ type: 'User', id: 'LIST' }],
    }),

    createUser: build.mutation<
      { ok: boolean; error?: string },
      CreateUserBody & { scope?: 'ceo' | 'admin' }
    >({
      query: ({ scope = 'ceo', ...body }) => ({
        url: scope === 'admin' ? '/admin/users' : '/ceo/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    updateUser: build.mutation<
      { ok: boolean; error?: string },
      { id: string; body: UpdateUserBody; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, body, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}` : `/ceo/users/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'User', id: arg.id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    deactivateUser: build.mutation<
      { ok: boolean; error?: string },
      { id: string; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}` : `/ceo/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'User', id: arg.id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    restoreUser: build.mutation<
      { ok: boolean; error?: string },
      { id: string; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}/restore` : `/ceo/users/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'User', id: arg.id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    resetPin: build.mutation<
      { ok: boolean; error?: string },
      { id: string; password: string; scope?: 'ceo' | 'admin' }
    >({
      query: ({ id, password, scope = 'ceo' }) => ({
        url: scope === 'admin' ? `/admin/users/${id}/reset-pin` : `/ceo/users/${id}/reset-pin`,
        method: 'POST',
        body: { password },
      }),
    }),
  }),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useRestoreUserMutation,
  useResetPinMutation,
} = usersApi;

import { baseApi } from './baseApi';
import type { Division } from '@/shared/types';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high';
export type AssigneeType = 'user' | 'division' | 'store' | 'all';

export interface TaskExtension {
  id: string;
  requestedByName: string | null;
  requestedDeadline: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  decidedAt: string | null;
}

export interface ApiTask {
  id: string;
  title: string;
  description: string;
  createdByName: string | null;
  assigneeType: AssigneeType;
  targetDivision: Division | null;
  assignees: Array<{ id: string; name: string | null }>;
  startAt: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  overdue: boolean;
  completedAt: string | null;
  extensions: TaskExtension[];
  createdAt: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  assigneeType: AssigneeType;
  assignees?: string[];
  targetDivision?: Division | null;
  targetStoreId?: string | null;
  startAt?: string;
  deadline: string;
  priority?: TaskPriority;
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listTasks: build.query<ApiTask[], void>({
      query: () => '/tasks',
      transformResponse: (res: { ok: boolean; tasks: ApiTask[] }) => res.tasks ?? [],
      providesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    createTask: build.mutation<{ ok: boolean; error?: string }, CreateTaskBody>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    updateTaskStatus: build.mutation<{ ok: boolean; error?: string }, { id: string; status: TaskStatus }>({
      query: ({ id, status }) => ({ url: `/tasks/${id}/status`, method: 'PATCH', body: { status } }),
      // Optimistik: ustun darhol o'zgaradi.
      async onQueryStarted({ id, status }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          tasksApi.util.updateQueryData('listTasks', undefined, (draft) => {
            const t = draft.find((x) => x.id === id);
            if (t) t.status = status;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    requestTaskExtension: build.mutation<
      { ok: boolean; error?: string },
      { id: string; requestedDeadline: string; reason: string }
    >({
      query: ({ id, requestedDeadline, reason }) => ({
        url: `/tasks/${id}/extension`,
        method: 'POST',
        body: { requestedDeadline, reason },
      }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    decideTaskExtension: build.mutation<
      { ok: boolean; error?: string },
      { taskId: string; extId: string; decision: 'approve' | 'reject'; comment?: string }
    >({
      query: ({ taskId, extId, decision, comment }) => ({
        url: `/tasks/${taskId}/extension/${extId}/decide`,
        method: 'POST',
        body: { decision, comment },
      }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),

    deleteTask: build.mutation<{ ok: boolean; error?: string }, { id: string }>({
      query: ({ id }) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      // Optimistik: karta darhol doskadan yo'qoladi.
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          tasksApi.util.updateQueryData('listTasks', undefined, (draft) => {
            const i = draft.findIndex((x) => x.id === id);
            if (i !== -1) draft.splice(i, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: 'Task', id: 'LIST' }],
    }),
  }),
});

export const {
  useListTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useRequestTaskExtensionMutation,
  useDecideTaskExtensionMutation,
  useDeleteTaskMutation,
} = tasksApi;

import { baseApi } from './baseApi';

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  ok: boolean;
  notifications: ApiNotification[];
  unreadCount: number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationsResponse, void>({
      query: () => '/notifications',
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),

    getUnreadCount: build.query<number, void>({
      query: () => '/notifications/unread-count',
      transformResponse: (res: { ok: boolean; count: number }) => res.count ?? 0,
      providesTags: [{ type: 'Notification', id: 'COUNT' }],
    }),

    markNotificationRead: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'COUNT' },
      ],
    }),

    markAllNotificationsRead: build.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'COUNT' },
      ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;

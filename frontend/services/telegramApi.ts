import { baseApi } from './baseApi';

export interface TelegramStatus {
  ok: boolean;
  linked: boolean;
  telegramUsername: string | null;
  botEnabled: boolean;
}

export interface LinkTokenResponse {
  ok: boolean;
  deepLink: string | null;
  token: string;
  expiresAt: string;
  error?: string;
  code?: string;
}

export const telegramApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTelegramStatus: build.query<TelegramStatus, void>({
      query: () => '/telegram/status',
      providesTags: [{ type: 'Telegram', id: 'STATUS' }],
    }),

    createTelegramLink: build.mutation<LinkTokenResponse, void>({
      query: () => ({ url: '/telegram/link', method: 'POST' }),
    }),

    unlinkTelegram: build.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/telegram/unlink', method: 'POST' }),
      invalidatesTags: [{ type: 'Telegram', id: 'STATUS' }],
    }),
  }),
});

export const {
  useGetTelegramStatusQuery,
  useCreateTelegramLinkMutation,
  useUnlinkTelegramMutation,
} = telegramApi;

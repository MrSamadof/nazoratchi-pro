import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Markaziy RTK Query API.
 *
 * Barcha feature slice'lar shu `baseApi`ga `injectEndpoints` orqali ulanadi —
 * shunda bitta kesh, bitta middleware va tag tizimi bo'ladi.
 *
 * `baseUrl: '/api'` — Next.js bu yo'lni Express backend'ga rewrite qiladi
 * (next.config.ts). Same-origin bo'lgani uchun httpOnly sessiya cookie'si
 * avtomatik yuboriladi (`credentials: 'include'` qo'shimcha kafolat).
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
  }),
  // Kesh invalidatsiyasi uchun barcha entity turlari shu yerda e'lon qilinadi.
  tagTypes: [
    'User',
    'Store',
    'Schedule',
    'Approval',
    'Attendance',
    'Notification',
    'Task',
    'Reward',
    'Telegram',
    'PenaltyRule',
    'Suggestion',
    'ShiftConfig',
  ],
  endpoints: () => ({}),
});

import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/services/baseApi';

/**
 * Store fabrikasi. Next.js'da har so'rov uchun yangi store yaratiladi
 * (SSR'da state'ni so'rovlar orasida bo'lishmaslik uchun), shuning uchun
 * singleton emas, `makeStore()` ishlatiladi.
 */
export const makeStore = () =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

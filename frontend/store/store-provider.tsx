'use client';

import { useRef, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makeStore, type AppStore } from './store';

/**
 * Redux Provider — klient chegarasi. Store har klient daraxti uchun bir marta
 * (useRef) yaratiladi, shunda re-render'da qayta yaratilmaydi.
 * `setupListeners` — refetchOnFocus / refetchOnReconnect uchun.
 */
export function StoreProvider({ children }: { children: ReactNode }): React.ReactElement {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setupListeners(storeRef.current.dispatch);
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}

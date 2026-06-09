/**
 * Server-side fetch helper (Server Components, route handlers).
 * Sessiya cookie'sini avtomatik Express backend'ga forwardlaydi.
 *
 * Client componentlar uchun: `lib/api-client.ts` dan apiFetchClient ishlatang.
 */

import 'server-only';
import { cookies } from 'next/headers';

const SSR_BASE = process.env.BACKEND_URL ?? 'http://localhost:4000';

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const headers = new Headers(options.headers as HeadersInit);
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (cookieHeader) headers.set('Cookie', cookieHeader);

  const res = await fetch(`${SSR_BASE}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });
  return (await res.json()) as T;
}

/**
 * Client-side fetch helper (use 'client' components only).
 * Next.js `/api/*` ni Express'ga rewrites qiladi — relative URL ishlatamiz.
 */

export async function apiFetchClient<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }
  return { ok: res.ok, status: res.status, data };
}

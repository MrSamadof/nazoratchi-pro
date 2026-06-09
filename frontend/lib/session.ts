import { apiFetch } from './api';
import { redirect } from 'next/navigation';

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'employee' | 'manager' | 'ceo';
  storeId: string | null;
}

interface SessionResponse {
  ok: boolean;
  user: SessionUser | null;
}

/**
 * Joriy session'ni backend'dan oladi (cookie orqali).
 * Hech qachon throw qilmaydi — null qaytaradi agar autentifikatsiyalanmagan bo'lsa.
 */
export async function getCurrentSession(): Promise<SessionUser | null> {
  try {
    const data = await apiFetch<SessionResponse>('/api/auth/session');
    return data.ok ? data.user : null;
  } catch {
    return null;
  }
}

/**
 * Auth talab qiluvchi sahifa uchun. Login yo'q bo'lsa /login ga yo'naltiradi.
 */
export async function requireSession(): Promise<SessionUser> {
  const user = await getCurrentSession();
  if (!user) redirect('/login');
  return user;
}

/**
 * Manager yoki CEO uchun. Boshqalar /dashboard ga yo'naltiriladi.
 */
export async function requireManagerSession(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== 'manager' && user.role !== 'ceo') redirect('/dashboard');
  return user;
}

/**
 * Faqat CEO uchun.
 */
export async function requireCeoSession(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== 'ceo') redirect('/dashboard');
  return user;
}

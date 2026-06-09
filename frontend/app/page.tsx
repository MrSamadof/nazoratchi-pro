import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/session';

export default async function HomePage(): Promise<never> {
  const user = await getCurrentSession();
  if (!user) redirect('/login');
  if (user.role === 'ceo') redirect('/ceo');
  redirect('/dashboard');
}

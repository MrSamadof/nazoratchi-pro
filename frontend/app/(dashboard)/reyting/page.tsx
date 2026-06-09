import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { weekdayName, formatDate } from '@/lib/format';
import { LeaderboardFull, type LeaderboardData } from '@/components/leaderboard';
import { DIVISION_LABELS } from '@/shared/types';

export const dynamic = 'force-dynamic';

interface LeaderboardResp extends LeaderboardData {
  ok: boolean;
}

export default async function ReytingPage(): Promise<React.ReactElement> {
  const user = await requireSession();
  // Reyting — savdoga oid; menejer savdoni ko'rmaydi.
  if (user.role === 'manager') redirect('/dashboard');

  const res = await apiFetch<LeaderboardResp>('/api/reports/leaderboard');
  const data: LeaderboardData = {
    stores: res.stores ?? [],
    employeesByDivision: res.employeesByDivision ?? [],
    me: res.me ?? { count: 0, rank: null, division: null },
  };

  const now = new Date();
  const dateLabel = `${weekdayName(now)} · ${formatDate(now)}`;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[12.5px] text-[color:var(--ink-3)]">{dateLabel}</div>
        <h1 className="mt-1 text-[28px] lg:text-[30px] font-semibold tracking-[-0.025em]">
          Bugungi reyting 🏆
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
          Bugun sotilgan mahsulotlar soni (dona) boʻyicha reyting.
        </p>
      </div>

      <LeaderboardFull data={data} />

      {data.me.rank !== null && (
        <div className="px-4 py-3 rounded-[12px] bg-[color:var(--background-2)] text-[13px] text-[color:var(--ink-2)]">
          {data.me.division ? `${DIVISION_LABELS[data.me.division]} bo'limida ` : 'Sizning o\'rningiz: '}
          <span className="font-semibold text-[color:var(--ink-1)]">{data.me.rank}-o&apos;rin</span>
          {' · '}
          <span className="font-semibold text-[color:var(--ink-1)]">{data.me.count}</span> dona
        </div>
      )}
    </div>
  );
}

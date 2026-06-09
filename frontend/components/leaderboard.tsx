import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DIVISION_LABELS, type Division } from '@/shared/types';

export interface LeaderboardStore {
  storeId: string;
  storeName: string;
  count: number;
}

export interface LeaderboardEmployee {
  userId: string;
  fullName: string;
  count: number;
  isMe: boolean;
}

export interface DivisionLeaderboard {
  division: Division;
  label: string;
  rows: LeaderboardEmployee[];
}

export interface LeaderboardData {
  stores: LeaderboardStore[];
  employeesByDivision: DivisionLeaderboard[];
  me: { count: number; rank: number | null; division: Division | null };
}

const MEDALS = ['🥇', '🥈', '🥉'];

function rankBadge(index: number): React.ReactElement {
  if (index < 3) {
    return <span className="text-[15px] leading-none w-5 text-center">{MEDALS[index]}</span>;
  }
  return (
    <span className="text-[12px] font-semibold tabular text-[color:var(--ink-3)] w-5 text-center">
      {index + 1}
    </span>
  );
}

function StoreRow({ store, index }: { store: LeaderboardStore; index: number }): React.ReactElement {
  return (
    <div className="flex items-center gap-3 py-2">
      {rankBadge(index)}
      <span className="flex-1 text-[13px] font-medium truncate">{store.storeName}</span>
      <span className="text-[13px] font-semibold tabular">
        {store.count}
        <span className="ml-1 text-[11px] font-medium text-[color:var(--ink-3)]">dona</span>
      </span>
    </div>
  );
}

function EmployeeRow({
  emp,
  index,
}: {
  emp: LeaderboardEmployee;
  index: number;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-2 -mx-2 rounded-[8px]',
        emp.isMe && 'bg-[color:var(--background-2)]',
      )}
    >
      {rankBadge(index)}
      <span className="flex-1 text-[13px] font-medium truncate">
        {emp.fullName}
        {emp.isMe && (
          <span className="ml-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[color:var(--ink-3)]">
            siz
          </span>
        )}
      </span>
      <span className="text-[13px] font-semibold tabular">
        {emp.count}
        <span className="ml-1 text-[11px] font-medium text-[color:var(--ink-3)]">dona</span>
      </span>
    </div>
  );
}

function EmptyHint(): React.ReactElement {
  return (
    <p className="text-[12.5px] text-[color:var(--ink-3)] py-2">
      Bugun hali hisobga olinadigan savdo yo&apos;q. Sotilgan mahsulotlar soni (dona) boʻyicha
      reyting tuziladi.
    </p>
  );
}

/**
 * Dashboard uchun ixcham reyting kartasi — top do'konlar + top xodimlar + o'z o'rni.
 */
export function LeaderboardCard({
  data,
  limit = 3,
}: {
  data: LeaderboardData;
  limit?: number;
}): React.ReactElement {
  const { stores, employeesByDivision, me } = data;
  const filledDivisions = employeesByDivision.filter((d) => d.rows.length > 0);
  const hasData = stores.length > 0 || filledDivisions.length > 0;

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-2)]">
          <Trophy className="size-[14px]" />
          Bugungi reyting
        </span>
        <Link
          href="/reyting"
          className="flex items-center gap-0.5 text-[11.5px] font-medium text-[color:var(--ink-3)] hover:text-[color:var(--ink-1)]"
        >
          To&apos;liq
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {!hasData ? (
        <EmptyHint />
      ) : (
        <div className="mt-3 space-y-3">
          {stores.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-3)] mb-0.5">
                Do&apos;konlar aro
              </div>
              <div className="divide-y divide-[color:var(--border)]">
                {stores.slice(0, limit).map((s, i) => (
                  <StoreRow key={s.storeId} store={s} index={i} />
                ))}
              </div>
            </div>
          )}

          {filledDivisions.map((d) => (
            <div key={d.division}>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-3)] mb-0.5">
                {d.label}
              </div>
              <div className="divide-y divide-[color:var(--border)]">
                {d.rows.slice(0, limit).map((e, i) => (
                  <EmployeeRow key={e.userId} emp={e} index={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {me.rank !== null && (
        <div className="mt-3 px-3.5 py-2.5 rounded-[10px] bg-[color:var(--background-2)] text-[12px] text-[color:var(--ink-2)]">
          {me.division ? `${DIVISION_LABELS[me.division]} bo'limida ` : ''}
          o&apos;rning: <span className="font-semibold text-[color:var(--ink-1)]">{me.rank}</span>
          {' · '}
          <span className="font-semibold text-[color:var(--ink-1)]">{me.count}</span> dona
        </div>
      )}
    </Card>
  );
}

/**
 * To'liq reyting — alohida sahifa uchun. Do'konlar va xodimlarning to'liq ro'yxati.
 */
export function LeaderboardFull({ data }: { data: LeaderboardData }): React.ReactElement {
  const { stores, employeesByDivision } = data;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-3">
          <Trophy className="size-[15px] text-[color:var(--ink-3)]" />
          Do&apos;konlar aro
        </div>
        {stores.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {stores.map((s, i) => (
              <StoreRow key={s.storeId} store={s} index={i} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-3">
          <Trophy className="size-[15px] text-[color:var(--ink-3)]" />
          Xodimlar aro
        </div>
        <div className="space-y-4">
          {employeesByDivision.map((d) => (
            <div key={d.division}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--ink-3)] mb-1">
                {d.label}
              </div>
              {d.rows.length === 0 ? (
                <p className="text-[12.5px] text-[color:var(--ink-3)] py-1">
                  Hali savdo yo&apos;q.
                </p>
              ) : (
                <div className="divide-y divide-[color:var(--border)]">
                  {d.rows.map((e, i) => (
                    <EmployeeRow key={e.userId} emp={e} index={i} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

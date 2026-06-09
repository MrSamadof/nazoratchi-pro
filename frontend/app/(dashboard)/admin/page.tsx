import Link from 'next/link';
import {
  ArrowRight,
  Bolt,
  Clock,
  Download,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { requireManagerSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { fullDateLabel, formatMoney, formatTime } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

interface Overview {
  ok: boolean;
  summary: {
    totalEmployees: number;
    checkedIn: number;
    checkedOut: number;
    late: number;
    absent: number;
    totalPenalty: number;
  };
  pendingUsers: number;
  pendingApprovals: number;
  offSiteEvents: Array<{
    attendanceId: string;
    userName: string;
    storeName: string;
    type: 'check_in' | 'check_out';
    at: string;
    distanceMeters: number | null;
    source: 'store' | 'other';
    note: string;
  }>;
}

interface PendingUsersResp {
  ok: boolean;
  total: number;
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    storeName: string | null;
    createdAt: string;
  }>;
}

interface PendingApprovalsResp {
  ok: boolean;
  approvals: Array<{
    id: string;
    type: string;
    userName: string;
    requestedDate: string;
    storeName: string;
  }>;
}

interface CeoInsightsResp {
  ok: boolean;
  stores: Array<{
    id: string;
    name: string;
    hasBillz: boolean;
    weekTotal: number;
    weekItems: number;
    weeklyTarget: number;
    trend: number[];
  }>;
}

export default async function AdminOverviewPage(): Promise<React.ReactElement> {
  const user = await requireManagerSession();

  const [overview, pendingUsersData, pendingApprovalsData, ceoData] = await Promise.all([
    apiFetch<Overview>('/api/admin/overview'),
    apiFetch<PendingUsersResp>('/api/admin/employees?approved=false&limit=4'),
    apiFetch<PendingApprovalsResp>('/api/admin/approvals'),
    user.role === 'ceo'
      ? apiFetch<CeoInsightsResp>('/api/ceo/insights')
      : Promise.resolve<CeoInsightsResp>({ ok: false, stores: [] }),
  ]);

  const { summary, pendingUsers, pendingApprovals } = overview;
  const offSiteEvents = overview.offSiteEvents ?? [];
  const pendingUsersList = pendingUsersData.employees ?? [];
  const pendingApprovalsList = pendingApprovalsData.approvals ?? [];
  const stores = ceoData.stores ?? [];
  const maxRev = Math.max(1, ...stores.map((s) => s.weekTotal));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[12.5px] text-[color:var(--ink-3)]">{fullDateLabel(new Date())}</div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] mt-1">Bugungi xulosa</h1>
          <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
            {summary.totalEmployees} ta xodim · {summary.checkedIn} keldi, {summary.late} kech,{' '}
            {summary.absent} kelmadi
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" size="sm">
            <Download />
            Eksport
          </Button>
          {user.role === 'ceo' && (
            <Link href="/ceo/ai-analysis">
              <Button size="sm">
                <Bolt />
                AI tahlil
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 6-stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Users />} label="Jami xodim" value={String(summary.totalEmployees)} />
        <StatCard
          icon={<UserCheck />}
          tone="emerald"
          label="Keldi"
          value={String(summary.checkedIn)}
        />
        <StatCard icon={<LogOut />} label="Ketdi" value={String(summary.checkedOut)} />
        <StatCard icon={<Clock />} tone="amber" label="Kech keldi" value={String(summary.late)} />
        <StatCard icon={<X />} tone="rose" label="Kelmadi" value={String(summary.absent)} />
        <StatCard
          icon={<Wallet />}
          tone="rose"
          label="Jarima"
          value={formatMoney(summary.totalPenalty)}
          unit="so'm"
        />
      </div>

      {/* Off-site alerts — only when there are events */}
      {offSiteEvents.length > 0 && (
        <Card
          className="p-6"
          style={{ borderColor: 'var(--amber-soft)' }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="size-10 grid place-items-center rounded-[10px] bg-[color:var(--amber-soft)] text-[color:var(--amber-ink)]">
                <MapPin className="size-[18px]" />
              </span>
              <div className="leading-tight">
                <div className="text-[14px] font-semibold">
                  Joylashuv bo&apos;yicha bildirishnomalar
                </div>
                <div className="text-[12px] text-[color:var(--ink-3)] mt-0.5">
                  Bugun do&apos;kondan tashqarida qayd qilingan keldi/ketdi
                </div>
              </div>
            </div>
            <Badge tone="amber" dot>
              {offSiteEvents.length} ta
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {offSiteEvents.map((e) => (
              <OffSiteEventRow key={`${e.attendanceId}-${e.type}`} event={e} />
            ))}
          </div>
        </Card>
      )}

      {/* Pending + Approvals */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pending users */}
        <Card
          className="p-6"
          style={{ borderColor: pendingUsers > 0 ? 'var(--amber-soft)' : 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="size-10 grid place-items-center rounded-[10px] bg-[color:var(--amber-soft)] text-[color:var(--amber-ink)]">
                <Users className="size-[18px]" />
              </span>
              <div className="leading-tight">
                <div className="text-[14px] font-semibold">Tasdiq kutayotgan xodimlar</div>
                <div className="text-[12px] text-[color:var(--ink-3)] mt-0.5">
                  Yangi ro'yxatdan o'tganlar
                </div>
              </div>
            </div>
            <span className="text-[30px] font-semibold tracking-[-0.025em]">{pendingUsers}</span>
          </div>
          {pendingUsersList.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {pendingUsersList.slice(0, 2).map((u) => {
                const fullName = `${u.lastName ?? ''} ${u.firstName}`.trim();
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-2.5 p-3 rounded-[10px] bg-[color:var(--background-2)]"
                  >
                    <Avatar name={fullName} size={28} />
                    <div className="leading-tight min-w-0">
                      <div className="text-[12.5px] font-semibold truncate">{fullName}</div>
                      <div className="text-[10.5px] text-[color:var(--ink-3)] truncate">
                        {u.storeName ?? "Do'kon yo'q"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 text-[12.5px] text-[color:var(--ink-3)] py-3 text-center">
              Hozircha hech kim yo'q
            </div>
          )}
          <Link href="/admin/pending" className="mt-4 block">
            <Button variant="outline" size="sm" className="w-full">
              {pendingUsers > 0 ? `${pendingUsers} ta xodimni ko'rib chiqish` : "Ko'rib chiqish"}
              <ArrowRight />
            </Button>
          </Link>
        </Card>

        {/* Pending approvals */}
        <Card
          className="p-6"
          style={{ borderColor: pendingApprovals > 0 ? 'var(--accent-line)' : 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="size-10 grid place-items-center rounded-[10px] bg-accent text-[color:var(--primary)]">
                <Mail className="size-[18px]" />
              </span>
              <div className="leading-tight">
                <div className="text-[14px] font-semibold">Ruxsat so'rovlari</div>
                <div className="text-[12px] text-[color:var(--ink-3)] mt-0.5">
                  Kech kelish va erta ketish
                </div>
              </div>
            </div>
            <span className="text-[30px] font-semibold tracking-[-0.025em]">
              {pendingApprovals}
            </span>
          </div>
          {pendingApprovalsList.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {pendingApprovalsList.slice(0, 2).map((a) => (
                <div key={a.id} className="p-3 rounded-[10px] bg-[color:var(--background-2)]">
                  <div className="flex items-center justify-between">
                    <Badge tone="accent">
                      {a.type === 'late_arrival' ? 'Kech' : 'Erta'}
                    </Badge>
                  </div>
                  <div className="text-[12.5px] font-semibold mt-1.5 truncate">{a.userName}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-[12.5px] text-[color:var(--ink-3)] py-3 text-center">
              Hozircha so'rov yo'q
            </div>
          )}
          <Link href="/admin/pending" className="mt-4 block">
            <Button variant="outline" size="sm" className="w-full">
              {pendingApprovals > 0
                ? `${pendingApprovals} ta so'rovni ko'rib chiqish`
                : "Ko'rib chiqish"}
              <ArrowRight />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Stores stripe (CEO only) */}
      {user.role === 'ceo' && stores.length > 0 && (
        <Card className="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-[14px] font-semibold">Do'konlar bo'yicha · oxirgi 7 kun</span>
            <Link href="/ceo/stores" className="text-[12px] text-primary font-medium">
              Batafsil →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {stores.map((s) => {
              const ratio = s.weekTotal / maxRev;
              const targetRatio =
                s.weeklyTarget > 0 ? s.weekTotal / s.weeklyTarget : null;
              return (
                <div
                  key={s.id}
                  className="p-3.5 rounded-[12px] bg-[color:var(--background-2)]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12.5px] font-semibold truncate">{s.name}</span>
                    <span className="text-[10.5px] text-[color:var(--ink-3)] tabular">
                      {s.weekItems} dona
                    </span>
                  </div>
                  <div className="text-[18px] font-semibold tabular">
                    {s.weekTotal > 0 ? `${(s.weekTotal / 1_000_000).toFixed(1)}M` : '—'}{' '}
                    <span className="text-[10px] text-[color:var(--ink-3)] font-medium">so'm</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-[color:var(--border)] overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${ratio * 100}%`,
                        background:
                          targetRatio !== null && targetRatio < 0.6
                            ? 'var(--amber)'
                            : 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function OffSiteEventRow({
  event,
}: {
  event: Overview['offSiteEvents'][number];
}): React.ReactElement {
  const isCheckIn = event.type === 'check_in';
  const Icon = isCheckIn ? LogIn : LogOut;
  const typeLabel = isCheckIn ? 'Keldi' : 'Ketdi';
  const where =
    event.source === 'other'
      ? 'boshqa joyda'
      : event.distanceMeters != null
        ? `${Math.round(event.distanceMeters)} m uzoqlikda`
        : 'do\'kondan tashqarida';
  return (
    <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[color:var(--background-2)]">
      <Avatar name={event.userName} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] font-semibold truncate">{event.userName}</span>
          <Badge tone={isCheckIn ? 'accent' : 'rose'}>
            <Icon className="size-3" />
            {typeLabel}
          </Badge>
          <span className="text-[11px] text-[color:var(--ink-3)] tabular">
            {formatTime(event.at)}
          </span>
        </div>
        <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5 truncate">
          {event.storeName} · {where}
        </div>
        {event.note && (
          <div className="text-[11.5px] text-[color:var(--ink-2)] italic mt-1 leading-[1.4]">
            &ldquo;{event.note}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  tone?: 'emerald' | 'amber' | 'rose';
  label: string;
  value: string;
  unit?: string;
}): React.ReactElement {
  const bg = tone
    ? { emerald: 'var(--emerald-soft)', amber: 'var(--amber-soft)', rose: 'var(--rose-soft)' }[tone]
    : 'var(--background-2)';
  const fg = tone
    ? { emerald: 'var(--emerald)', amber: 'var(--amber-ink)', rose: 'var(--rose)' }[tone]
    : 'var(--ink-2)';
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[color:var(--ink-3)] uppercase tracking-[0.04em] font-medium">
          {label}
        </span>
        <span
          className="size-7 grid place-items-center rounded-[8px] [&_svg]:size-3.5"
          style={{ background: bg, color: fg }}
        >
          {icon}
        </span>
      </div>
      <div
        className="mt-2.5 text-[22px] font-semibold tabular tracking-[-0.02em]"
        style={{ color: tone === 'rose' ? 'var(--rose)' : undefined }}
      >
        {value}
        {unit && (
          <span className="text-[11px] font-medium text-[color:var(--ink-3)] ml-1">{unit}</span>
        )}
      </div>
    </Card>
  );
}


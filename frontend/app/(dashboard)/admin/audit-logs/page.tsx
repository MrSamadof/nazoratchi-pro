import { Fragment } from 'react';
import { Cog, Download, Search, TriangleAlert } from 'lucide-react';
import { requireManagerSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: unknown;
  success: boolean;
  errorMessage: string;
  createdAt: string;
}

const actionMeta: Record<
  string,
  { label: string; tone: 'emerald' | 'amber' | 'rose' | 'accent' | 'neutral' }
> = {
  'user.register': { label: 'auth.register', tone: 'accent' },
  'user.login': { label: 'auth.login', tone: 'emerald' },
  'user.login_failed': { label: 'auth.fail', tone: 'rose' },
  'user.logout': { label: 'auth.logout', tone: 'neutral' },
  'user.approved': { label: 'employee.approve', tone: 'emerald' },
  'user.deactivated': { label: 'employee.deactivate', tone: 'rose' },
  'attendance.check_in': { label: 'attendance.checkin', tone: 'emerald' },
  'attendance.check_out': { label: 'attendance.checkout', tone: 'emerald' },
  'attendance.penalty_accepted': { label: 'penalty.accept', tone: 'accent' },
  'approval.requested': { label: 'request.create', tone: 'accent' },
  'approval.approved': { label: 'approval.approve', tone: 'accent' },
  'approval.rejected': { label: 'approval.reject', tone: 'rose' },
  'sale.created': { label: 'sale.create', tone: 'accent' },
  'admin.config_changed': { label: 'config.change', tone: 'amber' },
  'admin.report_generated': { label: 'report.generate', tone: 'accent' },
  'system.error': { label: 'system.error', tone: 'rose' },
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<React.ReactElement> {
  await requireManagerSession();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));

  const data = await apiFetch<{ ok: boolean; total: number; page: number; limit: number; logs: AuditLog[] }>(
    `/api/admin/audit-logs?page=${page}`,
  );
  const logs = data.logs ?? [];
  const total = data.total ?? 0;
  const limit = data.limit ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Counts for filter chips
  const errCount = logs.filter((l) => !l.success).length;
  const saleCount = logs.filter((l) => l.action.startsWith('sale.')).length;
  const attCount = logs.filter((l) => l.action.startsWith('attendance.')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Audit log</h1>
          <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
            Tizimdagi har bir amal — kim, qachon, qaerda
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download />
          CSV eksport
        </Button>
      </div>

      <Card className="p-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--ink-3)]" />
            <Input
              placeholder="Foydalanuvchi, amal yoki ID..."
              className="pl-8 h-9"
            />
          </div>
          <div className="hidden sm:block h-6 w-px bg-[color:var(--border)]" />
          <div className="flex gap-1.5 flex-wrap">
            <Badge tone="ink">Hammasi · {total}</Badge>
            {saleCount > 0 && (
              <Badge tone="accent" dot>
                Savdo · {saleCount}
              </Badge>
            )}
            {attCount > 0 && (
              <Badge tone="emerald" dot>
                Davomat · {attCount}
              </Badge>
            )}
            {errCount > 0 && (
              <Badge tone="rose" dot>
                Xato · {errCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-[12px] overflow-hidden border border-[color:var(--border)]">
          <div className="hidden md:grid grid-cols-[1fr_2fr_1.6fr_3fr] gap-3 px-4 py-2.5 bg-[color:var(--background-2)] text-[11px] font-medium text-[color:var(--ink-3)] uppercase tracking-[0.06em]">
            <span>Vaqt</span>
            <span>Foydalanuvchi</span>
            <span>Amal</span>
            <span>Tafsilot</span>
          </div>
          {logs.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-[color:var(--ink-3)] border-t">
              Yozuv yo'q
            </div>
          ) : (
            logs.map((l) => {
              const meta = actionMeta[l.action] ?? { label: l.action, tone: 'neutral' as const };
              const isSystem = !l.userName;
              const userChip = (
                <>
                  {isSystem ? (
                    <span className="size-7 grid place-items-center rounded-[8px] bg-[color:var(--background-2)] text-[color:var(--ink-2)] shrink-0">
                      <Cog className="size-3" />
                    </span>
                  ) : (
                    <Avatar name={l.userName!} size={26} />
                  )}
                  <span className="text-[12.5px] font-medium truncate">
                    {l.userName ?? 'system'}
                  </span>
                </>
              );
              const target = l.targetType ? `${l.targetType}/${l.targetId?.slice(-6) ?? '—'}` : '—';
              return (
                <Fragment key={l.id}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_2fr_1.6fr_3fr] gap-3 px-4 py-3 items-start border-t border-[color:var(--border)] bg-card hover:bg-[color:var(--background-2)]/30">
                    <span className="font-mono text-[11.5px] text-[color:var(--ink-2)] tabular">
                      {formatDateTime(l.createdAt)}
                    </span>
                    <div className="flex items-center gap-2.5 min-w-0">{userChip}</div>
                    <span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="font-mono text-[11.5px] text-[color:var(--ink-2)] truncate">
                        {target}
                      </div>
                      {l.errorMessage && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-[color:var(--rose-soft)] text-[color:var(--rose)] text-[11.5px]">
                          <TriangleAlert className="size-3" />
                          {l.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden px-4 py-3 border-t border-[color:var(--border)] bg-card">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="font-mono text-[11px] text-[color:var(--ink-3)] tabular ml-auto">
                        {formatDateTime(l.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0 mt-2">{userChip}</div>
                    <div className="font-mono text-[11px] text-[color:var(--ink-3)] truncate mt-1.5">
                      {target}
                    </div>
                    {l.errorMessage && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-[color:var(--rose-soft)] text-[color:var(--rose)] text-[11px] mt-2">
                        <TriangleAlert className="size-3 shrink-0" />
                        {l.errorMessage}
                      </div>
                    )}
                  </div>
                </Fragment>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[12px] text-[color:var(--ink-3)]">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total} yozuv ·{' '}
              {totalPages} sahifa
            </span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const p = i + 1;
                return (
                  <a
                    key={p}
                    href={`?page=${p}`}
                    className={`inline-flex items-center justify-center min-w-[32px] h-[30px] px-2 rounded-[8px] text-[12.5px] font-medium ${
                      p === page
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-[color:var(--border-2)] bg-card text-foreground hover:bg-[color:var(--background-2)]'
                    }`}
                  >
                    {p}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

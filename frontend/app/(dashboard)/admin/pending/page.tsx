import { ExternalLink, Inbox, UserPlus } from 'lucide-react';
import { requireManagerSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DecideButton } from '@/components/admin/decide-button';

export const dynamic = 'force-dynamic';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  storeName: string | null;
  createdAt: string;
}

interface Approval {
  id: string;
  type: 'late_arrival' | 'early_leave';
  requestedDate: string;
  requestedTime: string;
  reason: string;
  createdAt: string;
  userName: string;
  userPhone: string;
  storeName: string;
}

const typeLabel = {
  late_arrival: 'Kech kelish',
  early_leave: 'Erta ketish',
};

export default async function PendingPage(): Promise<React.ReactElement> {
  await requireManagerSession();

  const [empResp, apResp] = await Promise.all([
    apiFetch<{ ok: boolean; employees: Employee[] }>(
      '/api/admin/employees?approved=false&limit=50',
    ),
    apiFetch<{ ok: boolean; approvals: Approval[] }>('/api/admin/approvals'),
  ]);

  const pendingUsers = empResp.employees ?? [];
  const pendingApprovals = apResp.approvals ?? [];
  const focusApproval = pendingApprovals[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Kutilayotgan</h1>
        <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
          Yangi xodimlarni va ruxsat so'rovlarini tasdiqlang
        </p>
      </div>

      <Tabs defaultValue={pendingApprovals.length > 0 ? 'approvals' : 'users'}>
        <TabsList>
          <TabsTrigger value="users">
            Yangi xodimlar
            {pendingUsers.length > 0 && (
              <Badge tone="amber" className="ml-2">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals">
            Ruxsat so'rovlari
            {pendingApprovals.length > 0 && (
              <Badge tone="amber" className="ml-2">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {pendingUsers.length === 0 ? (
            <Empty icon={<UserPlus className="size-8 opacity-50" />} text="Yangi xodim yo'q" />
          ) : (
            <div className="space-y-2.5">
              {pendingUsers.map((u) => {
                const fullName = `${u.lastName} ${u.firstName}`.trim();
                return (
                  <Card key={u.id} className="p-5">
                    <div className="flex items-start gap-3.5">
                      <Avatar name={fullName} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold">{fullName}</span>
                          <Badge tone="amber" dot>
                            Kutilmoqda
                          </Badge>
                          <span className="font-mono text-[11.5px] text-[color:var(--ink-3)] tabular">
                            +{u.phone}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[color:var(--ink-3)] mt-1">
                          {u.storeName ?? "Do'kon yo'q"} · {formatDateTime(u.createdAt)}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <DecideButton
                          endpoint={`/api/admin/users/${u.id}/reject`}
                          decision="reject"
                        />
                        <DecideButton
                          endpoint={`/api/admin/users/${u.id}/approve`}
                          decision="approve"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approvals">
          {pendingApprovals.length === 0 ? (
            <Empty icon={<Inbox className="size-8 opacity-50" />} text="Kutilayotgan so'rov yo'q" />
          ) : (
            <div className="grid lg:grid-cols-[1.1fr_380px] gap-5 items-start">
              <div className="space-y-2.5">
                {pendingApprovals.map((a, i) => {
                  const isFocus = i === 0;
                  return (
                    <Card
                      key={a.id}
                      className="p-5"
                      style={
                        isFocus
                          ? {
                              borderColor: 'var(--primary)',
                              boxShadow: '0 0 0 3px var(--accent)',
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={a.userName} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold">{a.userName}</span>
                            <Badge tone="accent">{typeLabel[a.type]}</Badge>
                            <span className="font-mono text-[11.5px] text-[color:var(--ink-3)] tabular">
                              {formatDate(a.requestedDate)}
                              {a.requestedTime && ` · ${a.requestedTime}`}
                            </span>
                          </div>
                          {a.storeName && (
                            <div className="text-[11px] text-[color:var(--ink-3)] mt-0.5">
                              {a.storeName}
                            </div>
                          )}
                          {a.reason && (
                            <div className="mt-2 p-2.5 rounded-[10px] bg-[color:var(--background-2)] text-[12.5px] text-[color:var(--ink-2)] leading-[1.45]">
                              {a.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <DecideButton
                          endpoint={`/api/admin/approvals/${a.id}/decision`}
                          decision="reject"
                          withComment
                        />
                        <DecideButton
                          endpoint={`/api/admin/approvals/${a.id}/decision`}
                          decision="approve"
                          withComment
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Focus detail sidebar */}
              {focusApproval && (
                <Card className="p-6 lg:sticky lg:top-6">
                  <div className="flex items-center gap-3">
                    <Avatar name={focusApproval.userName} size={48} />
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold truncate">
                        {focusApproval.userName}
                      </div>
                      <div className="font-mono text-[12px] text-[color:var(--ink-3)] tabular">
                        +{focusApproval.userPhone || '—'}
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        <Badge tone="neutral">{focusApproval.storeName || '—'}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[color:var(--border)] my-4" />

                  <div className="space-y-2.5">
                    <Info label="Tur" value={<Badge tone="accent">{typeLabel[focusApproval.type]}</Badge>} />
                    <Info label="Sana" value={<span className="font-mono text-[12.5px] font-semibold tabular">{formatDate(focusApproval.requestedDate)}</span>} />
                    {focusApproval.requestedTime && (
                      <Info
                        label="Vaqt"
                        value={
                          <span className="font-mono text-[12.5px] font-semibold tabular">
                            {focusApproval.requestedTime}
                          </span>
                        }
                      />
                    )}
                    <Info
                      label="Yuborildi"
                      value={
                        <span className="font-mono text-[11.5px] text-[color:var(--ink-2)] tabular">
                          {formatDateTime(focusApproval.createdAt)}
                        </span>
                      }
                    />
                  </div>

                  {focusApproval.reason && (
                    <>
                      <div className="h-px bg-[color:var(--border)] my-4" />
                      <div className="text-[11.5px] uppercase tracking-[0.06em] text-[color:var(--ink-3)] font-medium">
                        Sabab
                      </div>
                      <p className="mt-1.5 text-[13px] text-[color:var(--ink-2)] leading-[1.55]">
                        {focusApproval.reason}
                      </p>
                    </>
                  )}

                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-[11.5px] text-[color:var(--ink-3)]">
                    <span>Telegram orqali javob yuboriladi</span>
                    <ExternalLink className="size-3" />
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11.5px] text-[color:var(--ink-3)]">{label}</span>
      {value}
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }): React.ReactElement {
  return (
    <Card className="py-12 text-center text-[color:var(--ink-3)] space-y-2">
      <div className="flex justify-center">{icon}</div>
      <p className="text-[13px]">{text}</p>
    </Card>
  );
}

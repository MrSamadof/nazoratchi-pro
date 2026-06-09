import { Fragment } from 'react';
import { ArrowUp, Bolt, Calendar, Info, Store as StoreIcon, TriangleAlert } from 'lucide-react';
import { requireCeoSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiAnalysisButton } from '@/components/admin/ai-analysis-button';

export const dynamic = 'force-dynamic';

interface SalesReport {
  ok: boolean;
  from: string;
  to: string;
  manualByStore: Array<{ storeName: string; quantity: number }>;
  billzByStore: Array<{ storeName: string; totalAmount: number; itemCount: number }>;
  grandTotalAmount: number;
}

async function getReport(period: 'daily' | 'weekly' | 'monthly'): Promise<SalesReport> {
  return apiFetch<SalesReport>(`/api/admin/reports/sales?period=${period}`);
}

function reportText(r: SalesReport, label: string): string {
  let text = `${label.toUpperCase()} HISOBOT\n${formatDate(r.from)} — ${formatDate(r.to)}\n\n`;
  text += "Billz savdo:\n";
  if (r.billzByStore.length === 0) text += "ma'lumot yo'q\n";
  else
    for (const b of r.billzByStore)
      text += `${b.storeName}: ${formatMoney(b.totalAmount)} so'm (${b.itemCount} dona)\n`;
  if (r.manualByStore.length > 0) {
    text += "\nQo'lda:\n";
    for (const m of r.manualByStore) text += `${m.storeName}: ${m.quantity} dona\n`;
  }
  text += `\nJami: ${formatMoney(r.grandTotalAmount)} so'm`;
  return text;
}

export default async function ReportsPage(): Promise<React.ReactElement> {
  await requireCeoSession();
  const [daily, weekly, monthly] = await Promise.all([
    getReport('daily'),
    getReport('weekly'),
    getReport('monthly'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Hisobotlar</h1>
          <p className="text-[13px] text-[color:var(--ink-3)] mt-1">
            Kunlik, haftalik va oylik savdo natijalari
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Calendar />
          Bu davr
        </Button>
      </div>

      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="daily">Kunlik</TabsTrigger>
          <TabsTrigger value="weekly">Haftalik</TabsTrigger>
          <TabsTrigger value="monthly">Oylik</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <ReportView report={daily} periodLabel="kunlik" />
        </TabsContent>
        <TabsContent value="weekly">
          <ReportView report={weekly} periodLabel="haftalik" />
        </TabsContent>
        <TabsContent value="monthly">
          <ReportView report={monthly} periodLabel="oylik" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportView({
  report,
  periodLabel,
}: {
  report: SalesReport;
  periodLabel: string;
}): React.ReactElement {
  const totalBillz = report.billzByStore.reduce((s, b) => s + b.totalAmount, 0);
  const totalManualQty = report.manualByStore.reduce((s, m) => s + m.quantity, 0);
  const totalItems = report.billzByStore.reduce((s, b) => s + b.itemCount, 0);
  const merged = mergeStores(report);
  const maxRev = Math.max(1, ...merged.map((m) => m.amount));

  return (
    <div className="space-y-5">
      {/* Hero + AI panel */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Card className="p-6">
          <div className="flex justify-between items-end mb-4 flex-wrap gap-3">
            <div className="space-y-1">
              <div className="text-[12px] text-[color:var(--ink-3)] tabular">
                {formatDate(report.from)} — {formatDate(report.to)} · jami savdo
              </div>
              <div className="text-[32px] font-semibold tracking-[-0.025em] tabular">
                {formatMoney(report.grandTotalAmount)}{' '}
                <span className="text-[14px] font-medium text-[color:var(--ink-3)]">so'm</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="emerald" dot>
                  Yangi davr
                </Badge>
                <span className="text-[11.5px] text-[color:var(--ink-3)]">
                  O'rtacha kunlik {(report.grandTotalAmount / 7 / 1_000_000).toFixed(1)}M so'm
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-[11.5px]">
              <Mini label="Billz" value={`${(totalBillz / 1_000_000).toFixed(1)}M`} />
              <Mini label="Qo'lda" value={`${totalManualQty} dona`} />
              <Mini label="Mahsulot" value={String(totalItems)} />
            </div>
          </div>
          {/* Bar chart */}
          <BarChart report={report} />
          <div className="mt-4 pt-3 border-t flex items-center gap-4 text-[11.5px] text-[color:var(--ink-2)]">
            <Legend color="var(--primary)" label="Billz POS" />
            <Legend color="var(--accent)" label="Qo'lda kiritilgan" />
          </div>
        </Card>

        {/* AI panel */}
        <Card
          className="p-6"
          style={{
            background: 'linear-gradient(150deg, var(--accent), var(--card) 70%)',
            borderColor: 'var(--accent-line)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <span className="size-9 grid place-items-center rounded-[10px] bg-primary text-primary-foreground">
              <Bolt className="size-4" />
            </span>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold">AI tahlil · Gemini</div>
              <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">
                Hisobotdan xulosa olish uchun
              </div>
            </div>
          </div>
          <div className="space-y-2.5 mt-3">
            <Insight
              tone="emerald"
              icon={<ArrowUp className="size-[10px]" />}
              text={
                merged[0]
                  ? `${merged[0].storeName} ${(merged[0].amount / 1_000_000).toFixed(1)}M soʻm bilan yetakchi.`
                  : "Hozircha ma'lumot yetarli emas"
              }
            />
            <Insight
              tone="amber"
              icon={<TriangleAlert className="size-[10px]" />}
              text="Hisobot tugagandan keyin AI tahlil olish tavsiya etiladi."
            />
            <Insight
              tone="accent"
              icon={<Info className="size-[10px]" />}
              text="Hisobot fayli (CSV/PDF) sozlamalardan eksport qilinadi."
            />
          </div>
          <div className="mt-4 pt-3 border-t border-[color:var(--accent-line)]">
            <AiAnalysisButton reportText={reportText(report, periodLabel)} period={periodLabel} />
          </div>
        </Card>
      </div>

      {/* Stores breakdown */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-[14px] font-semibold">Doʻkonlar boʻyicha</span>
          <span className="text-[11.5px] text-[color:var(--ink-3)]">Billz + qo'lda</span>
        </div>
        {merged.length === 0 ? (
          <p className="text-center py-8 text-[13px] text-[color:var(--ink-3)]">
            Ma'lumot yo'q
          </p>
        ) : (
          <div className="rounded-[12px] overflow-hidden border border-[color:var(--border)]">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2.5fr] gap-3 px-4 py-2.5 bg-[color:var(--background-2)] text-[11px] font-medium text-[color:var(--ink-3)] uppercase tracking-[0.06em]">
              <span>Do'kon</span>
              <span>Mahsulot</span>
              <span className="text-right">Summa</span>
              <span className="pl-6">Hissa</span>
            </div>
            {merged.map((m) => {
              const ratio = m.amount / maxRev;
              const sharePct = ((m.amount / Math.max(1, report.grandTotalAmount)) * 100).toFixed(0);
              const bar = (
                <div className="flex-1 h-1.5 rounded-full bg-[color:var(--background-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              );
              return (
                <Fragment key={m.storeName}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2.5fr] gap-3 px-4 py-3 items-center border-t border-[color:var(--border)] bg-card">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-7 grid place-items-center rounded-[8px] bg-[color:var(--background-2)] text-[color:var(--ink-2)] shrink-0">
                        <StoreIcon className="size-3.5" />
                      </span>
                      <span className="text-[13px] font-semibold truncate">{m.storeName}</span>
                    </div>
                    <span className="text-[13px] font-medium">
                      {m.quantity}{' '}
                      <span className="text-[10.5px] text-[color:var(--ink-3)] font-normal">dona</span>
                    </span>
                    <span className="text-[13px] font-semibold tabular text-right">
                      {formatMoney(m.amount)}
                    </span>
                    <div className="flex items-center gap-2.5 pl-6">
                      {bar}
                      <span className="font-mono text-[11.5px] text-[color:var(--ink-2)] tabular w-9 text-right">
                        {sharePct}%
                      </span>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden px-4 py-3 border-t border-[color:var(--border)] bg-card">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-7 grid place-items-center rounded-[8px] bg-[color:var(--background-2)] text-[color:var(--ink-2)] shrink-0">
                        <StoreIcon className="size-3.5" />
                      </span>
                      <span className="text-[13px] font-semibold truncate flex-1">{m.storeName}</span>
                      <span className="text-[13px] font-semibold tabular shrink-0">
                        {formatMoney(m.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-2">
                      {bar}
                      <span className="font-mono text-[11px] text-[color:var(--ink-3)] tabular shrink-0">
                        {m.quantity} dona · {sharePct}%
                      </span>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function mergeStores(
  r: SalesReport,
): Array<{ storeName: string; quantity: number; amount: number }> {
  const map = new Map<string, { quantity: number; amount: number }>();
  for (const b of r.billzByStore) {
    const cur = map.get(b.storeName) ?? { quantity: 0, amount: 0 };
    cur.quantity += b.itemCount;
    cur.amount += b.totalAmount;
    map.set(b.storeName, cur);
  }
  for (const m of r.manualByStore) {
    const cur = map.get(m.storeName) ?? { quantity: 0, amount: 0 };
    cur.quantity += m.quantity;
    // Pul (amount) faqat Billz'dan — qo'lda kiritilgan savdo faqat dona soni beradi.
    map.set(m.storeName, cur);
  }
  return Array.from(map.entries())
    .map(([storeName, v]) => ({ storeName, ...v }))
    .sort((a, b) => b.amount - a.amount);
}

function Mini({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] text-[color:var(--ink-3)]">{label}</span>
      <span className="text-[15px] font-semibold tabular">{value}</span>
    </div>
  );
}

function BarChart({ report }: { report: SalesReport }): React.ReactElement {
  // Simple visual: 7 bars based on stores total
  const stores = mergeStores(report).slice(0, 7);
  const max = Math.max(1, ...stores.map((s) => s.amount));
  return (
    <div className="grid grid-cols-7 gap-2.5 h-[180px] items-end">
      {Array.from({ length: 7 }).map((_, i) => {
        const s = stores[i];
        const h = s ? (s.amount / max) * 100 : 6;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="w-full flex flex-col gap-[2px] h-full justify-end">
              <div
                className="rounded-[6px_6px_0_0]"
                style={{
                  height: `${h * 0.4}%`,
                  background: 'var(--accent)',
                  minHeight: 4,
                }}
              />
              <div
                className="rounded-[0_0_6px_6px]"
                style={{
                  height: `${h * 0.6}%`,
                  background: 'var(--primary)',
                  minHeight: 4,
                }}
              />
            </div>
            <span className="text-[10.5px] text-[color:var(--ink-3)] truncate w-full text-center">
              {s ? s.storeName.split(' ')[0] : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function Insight({
  tone,
  icon,
  text,
}: {
  tone: 'emerald' | 'amber' | 'accent';
  icon: React.ReactNode;
  text: string;
}): React.ReactElement {
  const bg = {
    emerald: 'var(--emerald-soft)',
    amber: 'var(--amber-soft)',
    accent: 'var(--accent)',
  }[tone];
  const fg = {
    emerald: 'var(--emerald)',
    amber: 'var(--amber-ink)',
    accent: 'var(--primary)',
  }[tone];
  return (
    <div className="flex items-start gap-2">
      <span
        className="size-[18px] grid place-items-center rounded-full shrink-0 mt-0.5"
        style={{ background: bg, color: fg }}
      >
        {icon}
      </span>
      <span className="text-[12.5px] text-[color:var(--ink-2)] leading-[1.55]">{text}</span>
    </div>
  );
}

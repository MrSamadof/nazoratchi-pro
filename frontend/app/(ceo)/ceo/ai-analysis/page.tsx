import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bolt,
  Info,
  TriangleAlert,
} from 'lucide-react';
import { requireCeoSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { fullDateLabel, formatMoney, formatDateTime } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiAnalysisButton } from '@/components/admin/ai-analysis-button';

export const dynamic = 'force-dynamic';

interface CeoInsights {
  ok: boolean;
  today: {
    checkedIn: number;
    late: number;
    absent: number;
    totalEmployees: number;
    totalPenalty: number;
  };
  week: {
    totalSales: number;
    totalItems: number;
    salesByDay: number[];
    delta: number;
  };
  stores: Array<{
    id: string;
    name: string;
    weekTotal: number;
    weeklyTarget: number;
    trend: number[];
  }>;
}

function buildReportText(d: CeoInsights): string {
  const { today, week, stores } = d;
  const top = stores[0];
  let text = `HAFTALIK STRATEGIK XULOSA · ${fullDateLabel(new Date())}\n\n`;
  text += `Hafta savdosi: ${formatMoney(week.totalSales)} so'm`;
  if (week.delta !== 0) text += ` (${week.delta > 0 ? '+' : ''}${week.delta.toFixed(1)}%)`;
  text += `\n${week.totalItems} mahsulot · ${stores.length} do'kon\n\n`;
  text += `Bugungi davomat: ${today.checkedIn}/${today.totalEmployees} smenada, ${today.late} kech, ${today.absent} kelmadi\n`;
  if (today.totalPenalty > 0) text += `Bugungi jarima: ${formatMoney(today.totalPenalty)} so'm\n`;
  text += "\nDo'konlar reytingi:\n";
  for (const s of stores) {
    text += `- ${s.name}: ${formatMoney(s.weekTotal)} so'm`;
    if (s.weeklyTarget > 0) {
      const pct = (s.weekTotal / s.weeklyTarget) * 100;
      text += ` (${pct.toFixed(0)}% maqsaddan)`;
    }
    text += '\n';
  }
  if (top) text += `\nEng yaxshi do'kon: ${top.name}`;
  return text;
}

export default async function CeoAiAnalysisPage(): Promise<React.ReactElement> {
  await requireCeoSession();
  const insights = await apiFetch<CeoInsights>('/api/ceo/insights');
  const { today, week, stores } = insights;
  const top = stores[0];
  const struggling = stores.filter(
    (s) => s.weeklyTarget > 0 && s.weekTotal / s.weeklyTarget < 0.5,
  );
  const riskCount = struggling.length + (today.absent > 0 ? 1 : 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Document header */}
      <Card
        className="p-8 text-white border-transparent relative overflow-hidden mb-6"
        style={{
          background:
            'linear-gradient(160deg, oklch(0.18 0.012 268), oklch(0.30 0.05 268))',
        }}
      >
        <svg
          className="absolute -right-7 -bottom-10 opacity-15 pointer-events-none"
          width="240"
          height="240"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <circle cx="100" cy="100" r="98" fill="none" stroke="#fff" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#fff" />
          <circle cx="100" cy="100" r="22" fill="#fff" opacity=".4" />
        </svg>
        <div className="flex items-center gap-2.5 relative mb-4">
          <span className="size-9 grid place-items-center rounded-[10px] bg-white/15">
            <Bolt className="size-[17px]" />
          </span>
          <div className="leading-tight">
            <div className="text-[11.5px] opacity-65 uppercase tracking-[0.08em] font-medium">
              Haftalik strategik tahlil · Gemini
            </div>
            <div className="text-[11px] opacity-55 mt-0.5">
              Yaratildi {formatDateTime(new Date())}
            </div>
          </div>
        </div>
        <h1 className="text-[26px] lg:text-[30px] font-semibold tracking-[-0.025em] leading-[1.2] max-w-[720px] relative">
          {top && top.weekTotal > 0
            ? `${top.name} yetakchi, ${week.delta > 0 ? `+${week.delta.toFixed(0)}%` : 'barqaror'} oʻsish — `
            : 'Hafta xulosasi — '}
          {struggling.length > 0
            ? `${struggling.length} ta doʻkonga eʼtibor kerak.`
            : 'koʻrsatkichlar barqaror.'}
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-5 relative">
          <Stat label="Hafta" value="7 kun" />
          <Stat label="Savdo" value={`${formatMoney(week.totalSales)}`} />
          <Stat
            label="O'sish"
            value={`${week.delta >= 0 ? '+' : ''}${week.delta.toFixed(1)}%`}
          />
          <Stat
            label="Risk"
            value={riskCount > 0 ? `${riskCount} ta` : 'yoʻq'}
            danger={riskCount > 0}
          />
        </div>
      </Card>

      {/* TOC */}
      <Card className="p-5 mb-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TocItem n="01" title="Asosiy yutuqlar" icon={<ArrowUp className="size-[15px]" />} />
          <TocItem n="02" title="Diqqat kerak" icon={<TriangleAlert className="size-[15px]" />} />
          <TocItem n="03" title="Tavsiyalar" icon={<Info className="size-[15px]" />} />
          <TocItem n="04" title="Prognoz" icon={<BarChart3 className="size-[15px]" />} />
        </div>
      </Card>

      {/* Section 1 — Yutuqlar */}
      <Card className="p-7 mb-4">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-[color:var(--ink-3)]">
            01 · ASOSIY YUTUQLAR
          </span>
          <div className="flex-1 h-px bg-[color:var(--border)]" />
        </div>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
          {top && top.weekTotal > 0
            ? `${top.name} yetakchi oʻrinda`
            : 'Hozircha yetakchi koʻrsatkich yoʻq'}
        </h2>
        <p className="mt-2.5 text-[14px] leading-[1.65] text-[color:var(--ink-2)] max-w-[700px]">
          {top && top.weekTotal > 0 ? (
            <>
              <b>{top.name}</b> haftada{' '}
              <b>{formatMoney(top.weekTotal)} soʻm</b> savdo bilan barcha doʻkonlardan oldinda.
              {top.weeklyTarget > 0 && (
                <>
                  {' '}
                  Maqsaddan{' '}
                  <b className="text-foreground">
                    {((top.weekTotal / top.weeklyTarget) * 100).toFixed(0)}%
                  </b>{' '}
                  bajarildi.
                </>
              )}
              {week.delta > 0 && (
                <>
                  {' '}
                  Kompaniya boʻyicha hafta savdosi{' '}
                  <b className="text-foreground">+{week.delta.toFixed(1)}%</b> ko'paydi.
                </>
              )}
            </>
          ) : (
            "Yetarli ma'lumot yo'q — bir hafta ishlatib koʻring."
          )}
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          <HighlightTile
            label="Hafta savdo"
            value={`${(week.totalSales / 1_000_000).toFixed(1)}M`}
            delta={week.delta > 0 ? `+${week.delta.toFixed(0)}%` : null}
          />
          <HighlightTile label="Mahsulot" value={String(week.totalItems)} delta={null} />
          <HighlightTile
            label="Smenada"
            value={`${today.checkedIn}/${today.totalEmployees}`}
            delta={today.checkedIn === today.totalEmployees ? '100%' : null}
          />
        </div>
      </Card>

      {/* Section 2 — Diqqat */}
      <Card
        className="p-7 mb-4 border-l-[3px] border-l-[color:var(--rose)]"
      >
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-[color:var(--rose)]">
            02 · DIQQAT KERAK
          </span>
          <div className="flex-1 h-px bg-[color:var(--border)]" />
        </div>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
          {struggling.length > 0
            ? `${struggling.length} ta doʻkon maqsaddan ortda`
            : today.absent > 0
              ? `Bugun ${today.absent} xodim kelmadi`
              : 'Kritik holat yoʻq'}
        </h2>
        <p className="mt-2.5 text-[14px] leading-[1.65] text-[color:var(--ink-2)] max-w-[700px]">
          {struggling.length > 0 && (
            <>
              {struggling.map((s) => (
                <span key={s.id}>
                  <b>{s.name}</b>{' '}
                  <span className="text-[color:var(--rose)]">
                    ({((s.weekTotal / s.weeklyTarget) * 100).toFixed(0)}% maqsaddan)
                  </span>
                  {struggling.indexOf(s) < struggling.length - 1 ? ', ' : ' '}
                </span>
              ))}
              — bu doʻkonlarda menejer bilan ko'rib chiqish kerak.{' '}
            </>
          )}
          {today.late > 0 && (
            <>
              Bugun <b>{today.late} xodim</b> kech keldi.{' '}
            </>
          )}
          {today.absent > 0 && (
            <>
              <b>{today.absent} xodim</b> umuman kelmadi — sabablarni aniqlang.
            </>
          )}
          {struggling.length === 0 && today.absent === 0 && today.late === 0 && (
            <>Barcha koʻrsatkichlar bo'yicha hech qanday kritik holat yoʻq.</>
          )}
        </p>
      </Card>

      {/* Section 3 — Tavsiyalar */}
      <Card className="p-7 mb-4">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-primary">
            03 · TAVSIYALAR
          </span>
          <div className="flex-1 h-px bg-[color:var(--border)]" />
        </div>
        <div className="space-y-3.5 mt-1">
          {buildRecommendations(insights).map((r, i) => (
            <Recommendation key={i} n={i + 1} title={r.title} body={r.body} priority={r.priority} />
          ))}
        </div>
      </Card>

      {/* Section 4 — Prognoz + AI button */}
      <Card className="p-7">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-[color:var(--ink-3)]">
            04 · PROGNOZ
          </span>
          <div className="flex-1 h-px bg-[color:var(--border)]" />
        </div>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
          Joriy sur'at bilan oy yakuni
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-[1.65] text-[color:var(--ink-2)] max-w-[700px]">
          Haftalik savdoning 4 baravariga teng oylik prognoz:{' '}
          <b className="text-foreground tabular">{formatMoney(week.totalSales * 4)} soʻm</b>.{' '}
          Bayram va aksiyalar bilan {(((week.totalSales * 4) / 1_000_000) * 1.15).toFixed(1)}M soʻmga
          chiqishi mumkin.
        </p>
        <div className="mt-6 pt-5 border-t flex items-center justify-between flex-wrap gap-3">
          <div className="text-[11.5px] text-[color:var(--ink-3)]">
            Toʻliq AI tahlil olish uchun pastdagi tugmani bosing
          </div>
          <AiAnalysisButton reportText={buildReportText(insights)} period="haftalik" />
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] opacity-60">{label}</span>
      <span
        className={`text-[16px] font-semibold ${
          danger ? 'text-[color:#fbb1a8]' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TocItem({
  n,
  title,
  icon,
}: {
  n: string;
  title: string;
  icon: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-9 grid place-items-center rounded-[10px] bg-[color:var(--background-2)] text-[color:var(--ink-2)]">
        {icon}
      </span>
      <div className="leading-tight">
        <div className="text-[10.5px] text-[color:var(--ink-3)] tracking-[0.06em]">{n}</div>
        <div className="text-[13px] font-semibold">{title}</div>
      </div>
    </div>
  );
}

function HighlightTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string | null;
}): React.ReactElement {
  return (
    <div className="p-4 rounded-[12px] bg-[color:var(--emerald-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[color:var(--emerald)] font-semibold tracking-[0.06em] uppercase">
          {label}
        </span>
        <ArrowUp className="size-3.5 text-[color:var(--emerald)]" />
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tabular">{value}</div>
      {delta && (
        <span className="text-[11.5px] text-[color:var(--ink-2)]">{delta}</span>
      )}
    </div>
  );
}

function Recommendation({
  n,
  title,
  body,
  priority,
}: {
  n: number;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3.5 p-4 rounded-[12px] bg-[color:var(--background-2)]">
      <span className="size-9 grid place-items-center rounded-[10px] bg-card border text-[13px] font-semibold tabular shrink-0">
        {String(n).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[14px] font-semibold">{title}</span>
          <Badge tone={priority === 'high' ? 'rose' : priority === 'medium' ? 'amber' : 'neutral'}>
            {priority}
          </Badge>
        </div>
        <p className="text-[12.5px] leading-[1.55] text-[color:var(--ink-2)] mt-1">{body}</p>
      </div>
      <ArrowRight className="size-3.5 text-[color:var(--ink-3)] mt-2.5 shrink-0" />
    </div>
  );
}

function buildRecommendations(
  d: CeoInsights,
): Array<{ title: string; body: string; priority: 'high' | 'medium' | 'low' }> {
  const recs: Array<{ title: string; body: string; priority: 'high' | 'medium' | 'low' }> = [];
  const top = d.stores[0];
  const struggling = d.stores.filter((s) => s.weeklyTarget > 0 && s.weekTotal / s.weeklyTarget < 0.5);

  if (top && top.weekTotal > 0) {
    recs.push({
      title: `${top.name} yondashuvi`,
      body: 'Eng samarali doʻkonning tajribasini boshqa filiallarga koʻchirish — menejerlar bilan retrospektiva oʻtkazing.',
      priority: 'high',
    });
  }
  if (struggling.length > 0) {
    recs.push({
      title: `${struggling.length} ta doʻkonga haftalik retrospektiva`,
      body: 'Maqsaddan 50% ostidagi doʻkonlar uchun menejerlarni jalb qilib sabablarni aniqlash.',
      priority: 'high',
    });
  }
  if (d.today.absent > 0) {
    recs.push({
      title: 'Davomat siyosatini koʻrib chiqish',
      body: `Bugun ${d.today.absent} xodim kelmadi — sababchi tahlili kerak.`,
      priority: 'medium',
    });
  }
  recs.push({
    title: 'Tushlik vaqtini tahlil qilish',
    body: '13–14 oraligʻidagi savdo dinamikasini smena reja bilan moslashtirish — kichik optimizatsiya.',
    priority: 'low',
  });
  return recs;
}

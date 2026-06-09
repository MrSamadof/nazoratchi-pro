import Link from 'next/link';
import {
  Bolt,
  Building2,
  ChevronRight,
  Clock,
  Database,
  Plus,
  Send,
  Shield,
  Store as StoreIcon,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { requireCeoSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PenaltyRulesManager } from '@/components/ceo/penalty-rules-manager';
import { ShiftTemplatesManager } from '@/components/ceo/shift-templates-manager';
import { IntegrationsManager, type IntegrationsState } from '@/components/ceo/integrations-manager';

export const dynamic = 'force-dynamic';

interface StoresResp {
  ok: boolean;
  stores: Array<{
    id: string;
    name: string;
    slug: string;
    hasBillz: boolean;
    workStartTime: string;
    workEndTime: string;
    weeklyTarget: number;
  }>;
}

interface SystemStatusResp {
  ok: boolean;
  stores: number;
  billzActive: number;
  integrations: {
    billz: boolean;
    telegram: boolean;
    gemini: boolean;
    geminiModel: string;
  };
}

interface IntegrationsResp {
  ok: boolean;
  integrations: IntegrationsState;
}

const SECTIONS = [
  { id: 'company', label: 'Kompaniya', icon: Building2 },
  { id: 'stores', label: "Doʻkonlar", icon: StoreIcon },
  { id: 'penalties', label: 'Jarima qoidalari', icon: Wallet },
  { id: 'shifts', label: 'Smena soatlari', icon: Clock },
  { id: 'integrations', label: 'Integratsiyalar', icon: Database },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'ai', label: 'AI · Gemini', icon: Bolt },
  { id: 'team', label: 'Foydalanuvchilar', icon: Users },
  { id: 'security', label: 'Xavfsizlik', icon: Shield },
];

export default async function CeoSettingsPage(): Promise<React.ReactElement> {
  const user = await requireCeoSession();

  const [stores, system, integrationsData] = await Promise.all([
    apiFetch<StoresResp>('/api/stores/full'),
    apiFetch<SystemStatusResp>('/api/ceo/system-status'),
    apiFetch<IntegrationsResp>('/api/ceo/integrations'),
  ]);

  const storeList = stores.stores ?? [];
  const integrations = system.integrations;
  const fullName = `${user.lastName ?? ''} ${user.firstName}`.trim();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-[-0.025em]">Sozlamalar</h1>
          <p className="text-[13.5px] text-[color:var(--ink-2)] mt-1">
            Kompaniya, doʻkonlar, integratsiyalar, jarima qoidalari
          </p>
        </div>
      </div>

      <div className="flex gap-5 items-start flex-col lg:flex-row">
        {/* Sub-nav */}
        <Card className="p-3 w-full lg:w-[220px] lg:shrink-0 lg:sticky lg:top-6">
          <nav className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[12.5px] font-medium text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)] whitespace-nowrap"
                >
                  <Icon className="size-3.5" />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </Card>

        {/* Content */}
        <div className="flex-1 space-y-4 min-w-0 w-full">
          {/* Kompaniya */}
          <Card id="company" className="p-6 scroll-mt-6">
            <SectionHead
              icon={<Building2 className="size-4" />}
              tone="accent"
              title="Kompaniya maʼlumotlari"
              subtitle="Asosiy nom, manzil va kontakt"
            />
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <Field label="Kompaniya nomi" value="Amir Co." />
              <Field label="Direktor" value={fullName || 'CEO'} />
              <Field label="Manzil" value="Toshkent sh., Amir Temur koʻchasi 27" />
              <Field label="Telefon" value="+998 71 200 35 00" mono />
            </div>
            <p className="text-[11.5px] text-[color:var(--ink-3)] mt-4">
              Kompaniya maʼlumotlarini tahrirlash hozircha yopiq.
            </p>
          </Card>

          {/* Stores */}
          <Card id="stores" className="p-6 scroll-mt-6">
            <SectionHead
              icon={<StoreIcon className="size-4" />}
              tone="emerald"
              title={`Doʻkonlar · ${storeList.length}`}
              subtitle="Faol doʻkonlar va Billz POS holati"
              action={
                <Link href="/ceo/stores">
                  <Button variant="outline" size="sm">
                    <Plus />
                    Boshqarish
                  </Button>
                </Link>
              }
            />
            {storeList.length === 0 ? (
              <p className="text-[13px] text-[color:var(--ink-3)] py-6 text-center">
                Doʻkon yoʻq.{' '}
                <Link href="/ceo/stores" className="text-primary font-medium">
                  Yangi qoʻshish
                </Link>
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5 mt-5">
                {storeList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2.5 p-3 rounded-[12px] bg-[color:var(--background-2)]"
                  >
                    <span className="size-7 grid place-items-center rounded-[8px] bg-card border">
                      <StoreIcon className="size-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold truncate">{s.name}</div>
                      <div className="text-[10.5px] text-[color:var(--ink-3)] tabular">
                        {s.workStartTime}–{s.workEndTime}
                      </div>
                    </div>
                    {s.hasBillz ? (
                      <Badge tone="emerald" dot>
                        Billz
                      </Badge>
                    ) : (
                      <Badge tone="neutral">qoʻlda</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Penalty rules */}
          <Card id="penalties" className="p-6 scroll-mt-6">
            <SectionHead
              icon={<Wallet className="size-4" />}
              tone="rose"
              title="Jarima qoidalari"
              subtitle="Avtomatik hisoblash uchun — qo'shish, tahrirlash, o'chirish"
            />
            <PenaltyRulesManager />
          </Card>

          {/* Shift templates */}
          <Card id="shifts" className="p-6 scroll-mt-6">
            <SectionHead
              icon={<Clock className="size-4" />}
              tone="accent"
              title="Smena soatlari"
              subtitle="3 ta smena boshlanish/tugash vaqti — kech kelish shu asosda hisoblanadi"
            />
            <div className="mt-5">
              <ShiftTemplatesManager />
            </div>
          </Card>

          {/* Integrations */}
          <Card id="integrations" className="p-6 scroll-mt-6">
            <SectionHead
              icon={<Bolt className="size-4" />}
              tone="accent"
              title="Integratsiyalar"
              subtitle="Tashqi xizmatlar va API'lar"
            />
            <div className="space-y-2.5 mt-5">
              <IntegrationRow
                icon={<Database className="size-4" />}
                title="Billz POS"
                active={integrations.billz}
                subtitle={
                  integrations.billz
                    ? `${system.billzActive}/${system.stores} doʻkon · har soatda sinx`
                    : 'Secret token sozlanmagan — quyida kiriting'
                }
              />
              <IntegrationRow
                icon={<Send className="size-4" />}
                title="Telegram Bot"
                active={integrations.telegram}
                subtitle={
                  integrations.telegram
                    ? 'Bildirishnomalar yoqilgan'
                    : 'Token sozlanmagan — quyida kiriting'
                }
              />
              <IntegrationRow
                icon={<Bolt className="size-4" />}
                title="Gemini AI"
                active={integrations.gemini}
                subtitle={
                  integrations.gemini
                    ? `${integrations.geminiModel} · kunlik 21:00`
                    : 'Kalit sozlanmagan — quyida kiriting'
                }
              />
            </div>
            <p className="text-[11.5px] text-[color:var(--ink-3)] mt-4">
              Billz, Telegram va Gemini kalitlarini quyida toʻgʻridan-toʻgʻri kiriting —
              DB da shifrlangan holda saqlanadi.
            </p>
          </Card>

          {/* Telegram + Gemini — tahrirlanadigan kalitlar */}
          <IntegrationsManager initial={integrationsData.integrations} />

          {/* Team */}
          <Card id="team" className="p-6 scroll-mt-6">
            <SectionHead
              icon={<Users className="size-4" />}
              tone="accent"
              title="Foydalanuvchilar"
              subtitle="Xodim, menejer va CEO boshqaruvi"
              action={
                <Link href="/ceo/team">
                  <Button variant="outline" size="sm">
                    Toʻliq boshqaruv
                  </Button>
                </Link>
              }
            />
            <p className="text-[12.5px] text-[color:var(--ink-2)] mt-4 leading-[1.55]">
              Foydalanuvchilarni qoʻshish, oʻchirish va PIN tiklash uchun{' '}
              <Link href="/ceo/team" className="text-primary font-medium">
                Jamoa
              </Link>{' '}
              sahifasidan foydalaning.
            </p>
          </Card>

          {/* Security / Danger zone */}
          <Card id="security" className="p-6 scroll-mt-6 border-[color:var(--rose-soft)]">
            <SectionHead
              icon={<Shield className="size-4" />}
              tone="rose"
              title="Xavfli zona"
              subtitle="DB tozalash va boshqa qaytib bo'lmaydigan amallar"
            />
            <div className="mt-5 space-y-2">
              <SettingRow
                icon={Shield}
                label="Audit log"
                sub="Barcha tizim hodisalari"
                action={
                  <Link href="/admin/audit-logs">
                    <Button variant="ghost" size="sm">
                      Ochish
                      <ChevronRight />
                    </Button>
                  </Link>
                }
              />
              <SettingRow
                icon={X}
                label="DB ni tozalash"
                sub="Faqat terminalda: npm run seed"
                value="manual"
                danger
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionHead({
  icon,
  tone,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  tone: 'accent' | 'emerald' | 'rose';
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}): React.ReactElement {
  const bg = {
    accent: 'var(--accent)',
    emerald: 'var(--emerald-soft)',
    rose: 'var(--rose-soft)',
  }[tone];
  const fg = {
    accent: 'var(--primary)',
    emerald: 'var(--emerald)',
    rose: 'var(--rose)',
  }[tone];
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-9 grid place-items-center rounded-[10px] shrink-0"
        style={{ background: bg, color: fg }}
      >
        {icon}
      </span>
      <div className="leading-tight flex-1 min-w-0">
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <div className="text-[11.5px] text-[color:var(--ink-3)] font-medium">{label}</div>
      <div
        className={`px-3 h-10 flex items-center rounded-[10px] border border-[color:var(--border-2)] bg-[color:var(--background-2)] text-[13.5px] ${
          mono ? 'tabular' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  sub,
  value,
  action,
  danger,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  value?: string;
  action?: React.ReactNode;
  danger?: boolean;
  muted?: boolean;
}): React.ReactElement {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-[10px] bg-[color:var(--background-2)] ${
        muted ? 'opacity-60' : ''
      }`}
    >
      <span
        className={`size-9 grid place-items-center rounded-[9px] border ${
          danger
            ? 'bg-[color:var(--rose-soft)] text-[color:var(--rose)] border-transparent'
            : 'bg-card text-[color:var(--ink-2)] border-[color:var(--border)]'
        }`}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold ${danger ? 'text-[color:var(--rose)]' : ''}`}>
          {label}
        </div>
        {sub && <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">{sub}</div>}
      </div>
      {value && (
        <span className="text-[12.5px] text-[color:var(--ink-2)] font-medium tabular">{value}</span>
      )}
      {action}
    </div>
  );
}

function IntegrationRow({
  id,
  icon,
  title,
  subtitle,
  active,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
}): React.ReactElement {
  return (
    <div
      id={id}
      className="flex items-center gap-3 px-4 py-3.5 rounded-[10px] bg-[color:var(--background-2)]"
    >
      <span className="size-9 grid place-items-center rounded-[9px] bg-card text-[color:var(--ink-2)] border">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">{title}</span>
          {active ? (
            <Badge tone="emerald" dot>
              Yoqilgan
            </Badge>
          ) : (
            <Badge tone="neutral">Sozlanmagan</Badge>
          )}
        </div>
        <div className="text-[11.5px] text-[color:var(--ink-3)] mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  Database,
  Edit2,
  Loader2,
  MapPin,
  Plus,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalTrigger } from '@/components/ui/modal';
import { apiFetchClient } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface Store {
  id: string;
  name: string;
  slug: string;
  kind: 'store' | 'office';
  hasBillz: boolean;
  billzUuid: string | null;
  workStartTime: string;
  workEndTime: string;
  address: string;
  phone: string;
  location: { lat: number; lng: number } | null;
  geofenceRadiusMeters: number;
  weeklyTarget: number;
  monthlyTarget: number;
}

interface Props {
  initialStores: Store[];
}

export function StoresManager({ initialStores }: Props): React.ReactElement {
  const router = useRouter();
  // Server Component'dan kelgan prop — har refresh'dan keyin yangilanadi
  const stores = initialStores;
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState<Store | null>(null);

  async function refresh() {
    router.refresh();
  }

  return (
    <>
      <Card className="p-5 lg:p-6 mb-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <StoreIcon className="size-4 text-[color:var(--ink-2)]" />
            <h2 className="text-[14px] font-semibold">Do&apos;kon va ofislar ({stores.length})</h2>
          </div>
          <Modal open={createOpen} onOpenChange={setCreateOpen}>
            <ModalTrigger asChild>
              <Button>
                <Plus />
                Yangi qo&apos;shish
              </Button>
            </ModalTrigger>
            <StoreModal
              mode="create"
              onClose={() => setCreateOpen(false)}
              onSuccess={() => {
                setCreateOpen(false);
                refresh();
              }}
            />
          </Modal>
        </div>

        {stores.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-[color:var(--ink-3)]">
            Hozircha do&apos;kon yo&apos;q. Birinchisini qo&apos;shish uchun yuqoridagi tugmani bosing.
          </div>
        ) : (
          <div className="space-y-2">
            {stores.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 p-3 rounded-[12px] border bg-card hover:bg-[color:var(--background-2)]/40 transition-colors sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1 sm:items-center">
                <span className="size-10 rounded-[10px] grid place-items-center bg-[color:var(--background-2)] text-[color:var(--ink-2)] shrink-0">
                  {s.kind === 'office' ? <Building2 className="size-5" /> : <StoreIcon className="size-5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-semibold">{s.name}</span>
                    {s.kind === 'office' && <Badge tone="neutral">Ofis</Badge>}
                    {s.hasBillz && (
                      <Badge tone="accent" dot>
                        Billz
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11.5px] text-[color:var(--ink-3)] tabular mt-0.5">
                    {s.workStartTime}–{s.workEndTime}
                    {s.weeklyTarget > 0 && (
                      <>
                        {' · '}
                        Maqsad: {formatMoney(s.weeklyTarget)} so&apos;m/hafta
                      </>
                    )}
                  </div>
                </div>
                </div>
                <div className="flex gap-1.5 shrink-0 justify-end border-t pt-2.5 sm:border-t-0 sm:pt-0">
                  <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                    <Edit2 />
                    Tahrirlash
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(s)}>
                    <Trash2 className="text-[color:var(--rose)]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit modal */}
      {editing && (
        <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <StoreModal
            mode="edit"
            store={editing}
            onClose={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <Modal open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <DeleteConfirm
            store={deleting}
            onClose={() => setDeleting(null)}
            onSuccess={() => {
              setDeleting(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function StoreModal({
  mode,
  store,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  store?: Store;
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactElement {
  const [name, setName] = useState(store?.name ?? '');
  const [slug, setSlug] = useState(store?.slug ?? '');
  const [kind, setKind] = useState<'store' | 'office'>(store?.kind ?? 'store');
  const isOffice = kind === 'office';
  const [hasBillz, setHasBillz] = useState(store?.hasBillz ?? false);
  const [billzUuid, setBillzUuid] = useState(store?.billzUuid ?? '');
  const [workStart, setWorkStart] = useState(store?.workStartTime ?? '09:00');
  const [workEnd, setWorkEnd] = useState(store?.workEndTime ?? '18:00');
  const [address, setAddress] = useState(store?.address ?? '');
  const [phone, setPhone] = useState(store?.phone ?? '');
  const [lat, setLat] = useState(store?.location?.lat != null ? String(store.location.lat) : '');
  const [lng, setLng] = useState(store?.location?.lng != null ? String(store.location.lng) : '');
  const [radius, setRadius] = useState(String(store?.geofenceRadiusMeters ?? 100));
  const [locatingMe, setLocatingMe] = useState(false);
  const [weeklyTarget, setWeeklyTarget] = useState(String(store?.weeklyTarget ?? ''));
  const [monthlyTarget, setMonthlyTarget] = useState(String(store?.monthlyTarget ?? ''));
  const [submitting, setSubmitting] = useState(false);

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Brauzer joylashuvni qo\'llab-quvvatlamaydi');
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocatingMe(false);
        toast.success(`Joylashuv olindi (±${Math.round(pos.coords.accuracy)} m)`);
      },
      (err) => {
        setLocatingMe(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? 'Joylashuv ruxsati berilmadi'
            : 'Joylashuvni olib bo\'lmadi',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // Auto-derive slug from name in create mode
  function handleName(v: string) {
    setName(v);
    if (mode === 'create' && (!slug || slug === toSlug(name))) {
      setSlug(toSlug(v));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Nom kamida 2 belgi');
      return;
    }
    if (!slug.match(/^[a-z0-9-]+$/)) {
      toast.error("Slug faqat a-z, 0-9, '-'");
      return;
    }
    // Geofence: lat/lng birga bo'lishi shart
    const latNum = lat.trim() ? Number(lat) : null;
    const lngNum = lng.trim() ? Number(lng) : null;
    if ((latNum === null) !== (lngNum === null)) {
      toast.error('Lat va Lng ikkalasi ham kerak');
      return;
    }
    if (latNum !== null && (Number.isNaN(latNum) || latNum < -90 || latNum > 90)) {
      toast.error("Lat -90 dan 90 gacha bo'lishi kerak");
      return;
    }
    if (lngNum !== null && (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      toast.error("Lng -180 dan 180 gacha bo'lishi kerak");
      return;
    }
    const radiusNum = parseInt(radius || '100', 10);
    if (Number.isNaN(radiusNum) || radiusNum < 10 || radiusNum > 5000) {
      toast.error("Radius 10–5000 m oralig'ida bo'lishi kerak");
      return;
    }
    setSubmitting(true);
    const body = {
      name: name.trim(),
      slug: slug.trim(),
      kind,
      // Ofis savdo qilmaydi — Billz va maqsadlar yuborilmaydi.
      hasBillz: isOffice ? false : hasBillz,
      billzUuid: isOffice ? null : billzUuid || null,
      workStartTime: workStart,
      workEndTime: workEnd,
      address,
      phone,
      location: latNum !== null && lngNum !== null ? { lat: latNum, lng: lngNum } : null,
      geofenceRadiusMeters: radiusNum,
      weeklyTarget: isOffice ? 0 : parseInt(weeklyTarget || '0', 10),
      monthlyTarget: isOffice ? 0 : parseInt(monthlyTarget || '0', 10),
    };
    const res =
      mode === 'create'
        ? await apiFetchClient<{ ok: boolean; error?: string }>('/api/stores', {
            method: 'POST',
            body,
          })
        : await apiFetchClient<{ ok: boolean; error?: string }>(`/api/stores/${store!.id}`, {
            method: 'PATCH',
            body,
          });
    setSubmitting(false);
    if (!res.data.ok) {
      toast.error(res.data.error ?? "Saqlanmadi");
      return;
    }
    toast.success(mode === 'create' ? "Do'kon qo'shildi" : "Saqlanladi");
    onSuccess();
  }

  return (
    <ModalContent
      icon={mode === 'create' ? <Plus /> : <Edit2 />}
      iconTone={mode === 'create' ? 'emerald' : 'accent'}
      title={
        mode === 'create'
          ? isOffice
            ? 'Yangi ofis qo\'shish'
            : "Yangi do'kon qo'shish"
          : isOffice
            ? 'Ofisni tahrirlash'
            : "Do'konni tahrirlash"
      }
      subtitle={
        mode === 'create'
          ? isOffice
            ? 'Ofis xodimlari keldim-ketdim qiladi (savdosiz).'
            : 'Faollashtirilgach Billz POS bilan ulashish mumkin.'
          : `ID ${store!.id.slice(-6)}`
      }
      width={520}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form="store-form" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {mode === 'create' ? "Qo'shish" : 'Saqlash'}
          </Button>
        </div>
      }
    >
      <form id="store-form" onSubmit={submit} className="space-y-3.5">
        <Field label="Tur">
          <div className="grid grid-cols-2 gap-2">
            <KindOption
              active={!isOffice}
              icon={<StoreIcon className="size-4" />}
              title="Do'kon"
              subtitle="Savdo + davomat"
              onClick={() => setKind('store')}
            />
            <KindOption
              active={isOffice}
              icon={<Building2 className="size-4" />}
              title="Ofis"
              subtitle="Faqat davomat"
              onClick={() => setKind('office')}
            />
          </div>
        </Field>
        <Field label="Nom">
          <Input value={name} onChange={(e) => handleName(e.target.value)} placeholder={isOffice ? 'Bosh ofis' : 'Amir Style'} />
        </Field>
        <Field label="Slug" hint="URL uchun (a-z, 0-9, '-')">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="amir-style"
            className="font-mono"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Smena boshlanishi">
            <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="tabular" />
          </Field>
          <Field label="Smena oxiri">
            <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="tabular" />
          </Field>
        </div>
        <Field label="Manzil" optional>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Toshkent, Amir Temur 27" />
        </Field>
        <Field label="Telefon" optional>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 71 200 35 00" />
        </Field>

        <div className="rounded-[10px] border border-[color:var(--border)] p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="size-7 grid place-items-center rounded-[8px] bg-[color:var(--background-2)] text-[color:var(--ink-2)]">
                <MapPin className="size-3.5" />
              </span>
              <div>
                <div className="text-[12.5px] font-semibold">Joylashuv (geofencing)</div>
                <div className="text-[11px] text-[color:var(--ink-3)]">
                  Davomat radius ichida tasdiqlanadi
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={useMyLocation}
              disabled={locatingMe}
            >
              {locatingMe ? <Loader2 className="animate-spin" /> : <MapPin />}
              Joriy joyimni olish
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Lat" optional>
              <Input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="41.311081"
                className="tabular font-mono"
                inputMode="decimal"
              />
            </Field>
            <Field label="Lng" optional>
              <Input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="69.240562"
                className="tabular font-mono"
                inputMode="decimal"
              />
            </Field>
            <Field label="Radius (m)">
              <Input
                type="number"
                inputMode="numeric"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="100"
                className="tabular"
                min={10}
                max={5000}
              />
            </Field>
          </div>
        </div>

        {!isOffice && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Haftalik maqsad (so'm)" optional>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(e.target.value)}
                  placeholder="5000000"
                  className="tabular"
                />
              </Field>
              <Field label="Oylik maqsad (so'm)" optional>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(e.target.value)}
                  placeholder="20000000"
                  className="tabular"
                />
              </Field>
            </div>

            <div className="rounded-[10px] bg-[color:var(--background-2)] p-3 flex items-start gap-2.5">
              <span className="size-8 grid place-items-center rounded-[8px] bg-card text-[color:var(--ink-2)]">
                <Database className="size-4" />
              </span>
              <div className="flex-1">
                <div className="text-[12.5px] font-semibold">Billz POS ulanish</div>
                <div className="text-[11px] text-[color:var(--ink-3)]">
                  Sotuvlar har soat avtomatik tushadi
                </div>
              </div>
              <Toggle on={hasBillz} onChange={setHasBillz} />
            </div>
            {hasBillz && (
              <Field label="Billz UUID">
                <Input
                  value={billzUuid}
                  onChange={(e) => setBillzUuid(e.target.value)}
                  placeholder="abc-123-..."
                  className="font-mono"
                />
              </Field>
            )}
          </>
        )}
      </form>
    </ModalContent>
  );
}

function DeleteConfirm({
  store,
  onClose,
  onSuccess,
}: {
  store: Store;
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactElement {
  const [submitting, setSubmitting] = useState(false);
  async function del() {
    setSubmitting(true);
    const res = await apiFetchClient<{ ok: boolean; error?: string }>(`/api/stores/${store.id}`, {
      method: 'DELETE',
    });
    setSubmitting(false);
    if (!res.data.ok) {
      toast.error(res.data.error ?? "O'chirib bo'lmadi");
      return;
    }
    toast.success("Do'kon o'chirildi");
    onSuccess();
  }
  return (
    <ModalContent
      icon={<Trash2 />}
      iconTone="rose"
      title="Do'konni o'chirishni xohlaysizmi?"
      subtitle="Bu amalni orqaga qaytarib bo'lmaydi. Eski savdo va davomat ma'lumotlari saqlanadi."
      width={420}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="button" variant="destructive" onClick={del} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            <Trash2 />
            O&apos;chirish
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[color:var(--background-2)]">
        <span className="size-9 grid place-items-center rounded-[10px] bg-card text-[color:var(--ink-2)]">
          <StoreIcon className="size-4" />
        </span>
        <div>
          <div className="text-[13px] font-semibold">{store.name}</div>
          <div className="text-[11.5px] text-[color:var(--ink-3)]">
            {store.workStartTime}–{store.workEndTime}
            {store.weeklyTarget > 0 && ` · ${formatMoney(store.weeklyTarget)} so'm/hafta`}
          </div>
        </div>
      </div>
    </ModalContent>
  );
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">{label}</Label>
        {optional && <span className="text-[11px] text-[color:var(--ink-3)]">ixtiyoriy</span>}
      </div>
      {children}
      {hint && <div className="text-[11.5px] text-[color:var(--ink-3)]">{hint}</div>}
    </div>
  );
}

function KindOption({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border-primary bg-accent'
          : 'border-[color:var(--border-2)] hover:bg-[color:var(--background-2)]'
      }`}
    >
      <span
        className={`size-8 grid place-items-center rounded-[8px] shrink-0 ${
          active ? 'bg-primary text-primary-foreground' : 'bg-[color:var(--background-2)] text-[color:var(--ink-2)]'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[11px] text-[color:var(--ink-3)]">{subtitle}</div>
      </div>
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? 'bg-primary' : 'bg-[color:var(--border-2)]'
      }`}
      aria-pressed={on}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          on ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}


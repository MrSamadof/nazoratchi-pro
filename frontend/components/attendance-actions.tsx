'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  checkedIn: boolean;
  checkedOut: boolean;
}

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

function getPosition(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}

export function AttendanceActions({ checkedIn, checkedOut }: Props): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState<'in' | 'out' | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  async function submitCheckIn(payload: { source: 'store' | 'other'; note?: string }) {
    setLoading('in');
    try {
      const coords = await getPosition();
      const body: Record<string, unknown> = { source: payload.source };
      if (payload.note) body.note = payload.note;
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
        body.accuracy = coords.accuracy;
      }
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Bo'lmadi");
        return;
      }
      if (data.isLate) {
        toast.warning(
          `Kech keldingiz: ${data.lateMinutes} daq.${data.penaltyAmount ? ` (jarima: ${data.penaltyAmount.toLocaleString('uz-UZ')} so'm)` : ''}`,
        );
      } else {
        toast.success('Keldim qayd qilindi!');
      }
      if (data.source === 'other') {
        toast.info("Boshqa joyda boshlandi — admin ko'rib chiqishi mumkin");
      } else if (!coords) {
        toast.warning("Joylashuv olinmadi — yozuv joylashuvsiz saqlandi");
      } else if (data.offSite) {
        toast.warning(
          `Do'kondan uzoqdasiz (${Math.round(data.distanceMeters)} m) — yozuv off-site sifatida belgilandi`,
        );
      }
      setCheckinOpen(false);
      router.refresh();
    } catch {
      toast.error('Tarmoq xatosi');
    } finally {
      setLoading(null);
    }
  }

  async function submitCheckOut(payload: { source: 'store' | 'other'; note?: string }) {
    setLoading('out');
    try {
      const coords = await getPosition();
      const body: Record<string, unknown> = { source: payload.source };
      if (payload.note) body.note = payload.note;
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
        body.accuracy = coords.accuracy;
      }
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Bo'lmadi");
        return;
      }
      const hours = Math.floor(data.workedMinutes / 60);
      const mins = data.workedMinutes % 60;
      if (data.isEarly) {
        toast.warning(
          `Erta ketdingiz: ${data.earlyLeaveMinutes} daq.${data.penaltyAmount ? ` (jarima: ${data.penaltyAmount.toLocaleString('uz-UZ')} so'm)` : ''}`,
        );
      } else {
        toast.success(`Smena yakunlandi. Ishladingiz: ${hours} soat ${mins} daq.`);
      }
      if (data.source === 'other') {
        toast.info("Boshqa joyda yakunlandi — admin ko'rib chiqishi mumkin");
      } else if (!coords) {
        toast.warning("Joylashuv olinmadi — yozuv joylashuvsiz saqlandi");
      } else if (data.offSite) {
        toast.warning(
          `Do'kondan uzoqdasiz (${Math.round(data.distanceMeters)} m) — off-site deb belgilandi`,
        );
      }
      setCheckoutOpen(false);
      router.refresh();
    } catch {
      toast.error('Tarmoq xatosi');
    } finally {
      setLoading(null);
    }
  }

  if (!checkedIn) {
    return (
      <>
        <Button
          size="xl"
          variant="success"
          className="w-full"
          onClick={() => setCheckinOpen(true)}
          disabled={!!loading}
        >
          {loading === 'in' ? <Loader2 className="animate-spin" /> : <LogIn />}
          Keldim · smenani boshlash
        </Button>
        <Modal open={checkinOpen} onOpenChange={(o) => !loading && setCheckinOpen(o)}>
          <CheckInModal
            loading={loading === 'in'}
            onSubmit={submitCheckIn}
            onCancel={() => setCheckinOpen(false)}
          />
        </Modal>
      </>
    );
  }
  if (!checkedOut) {
    return (
      <>
        <Button
          size="xl"
          variant="destructive"
          className="w-full"
          onClick={() => setCheckoutOpen(true)}
          disabled={!!loading}
        >
          {loading === 'out' ? <Loader2 className="animate-spin" /> : <LogOut />}
          Ketdim · smenani yakunlash
        </Button>
        <Modal open={checkoutOpen} onOpenChange={(o) => !loading && setCheckoutOpen(o)}>
          <CheckOutModal
            loading={loading === 'out'}
            onSubmit={submitCheckOut}
            onCancel={() => setCheckoutOpen(false)}
          />
        </Modal>
      </>
    );
  }
  return (
    <Button size="xl" disabled variant="outline" className="w-full">
      Bugungi smena yakunlangan
    </Button>
  );
}

function CheckInModal({
  loading,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  onSubmit: (payload: { source: 'store' | 'other'; note?: string }) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [source, setSource] = useState<'store' | 'other'>('store');
  const [note, setNote] = useState('');
  const canSubmit = source === 'store' || note.trim().length >= 3;

  function handle() {
    if (!canSubmit) return;
    onSubmit({ source, note: source === 'other' ? note.trim() : undefined });
  }

  return (
    <ModalContent
      icon={<LogIn />}
      iconTone="emerald"
      title="Smenani qayerda boshlayapsiz?"
      subtitle="Joylashuvni avtomatik tekshiramiz. Boshqa joyda bo'lsangiz, qisqacha sabab yozing."
      width={460}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Bekor qilish
          </Button>
          <Button type="button" variant="success" onClick={handle} disabled={loading || !canSubmit}>
            {loading && <Loader2 className="animate-spin" />}
            <LogIn />
            Smenani boshlash
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <SourceOption
          active={source === 'store'}
          icon={<Store className="size-4" />}
          title="Do'konda boshladim"
          subtitle="Joriy lokatsiya do'kon radiusida bo'lishi tekshiriladi"
          onClick={() => setSource('store')}
        />
        <SourceOption
          active={source === 'other'}
          icon={<MapPin className="size-4" />}
          title="Boshqa joyda boshladim"
          subtitle="Off-site deb belgilanadi, sabab yozing"
          onClick={() => setSource('other')}
        />

        {source === 'other' && (
          <div className="space-y-1.5 pt-1">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
              Sabab (majburiy)
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: ombordan to'g'ridan-to'g'ri ish boshladim"
              rows={3}
              maxLength={500}
              autoFocus
            />
            <div className="text-[11px] text-[color:var(--ink-3)]">
              Kamida 3 ta belgi · {note.length}/500
            </div>
          </div>
        )}
      </div>
    </ModalContent>
  );
}

function CheckOutModal({
  loading,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  onSubmit: (payload: { source: 'store' | 'other'; note?: string }) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [source, setSource] = useState<'store' | 'other'>('store');
  const [note, setNote] = useState('');
  const canSubmit = source === 'store' || note.trim().length >= 3;

  function handle() {
    if (!canSubmit) return;
    onSubmit({ source, note: source === 'other' ? note.trim() : undefined });
  }

  return (
    <ModalContent
      icon={<LogOut />}
      iconTone="rose"
      title="Smenani qayerda yakunladingiz?"
      subtitle="Joylashuvni avtomatik tekshiramiz. Boshqa joyda bo'lsangiz, qisqacha sabab yozing."
      width={460}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Bekor qilish
          </Button>
          <Button type="button" variant="destructive" onClick={handle} disabled={loading || !canSubmit}>
            {loading && <Loader2 className="animate-spin" />}
            <LogOut />
            Smenani yakunlash
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <SourceOption
          active={source === 'store'}
          icon={<Store className="size-4" />}
          title="Do'konda tugatdim"
          subtitle="Joriy lokatsiya do'kon radiusida bo'lishi tekshiriladi"
          onClick={() => setSource('store')}
        />
        <SourceOption
          active={source === 'other'}
          icon={<MapPin className="size-4" />}
          title="Boshqa joyda tugatdim"
          subtitle="Off-site deb belgilanadi, sabab yozing"
          onClick={() => setSource('other')}
        />

        {source === 'other' && (
          <div className="space-y-1.5 pt-1">
            <Label className="text-[12.5px] font-medium text-[color:var(--ink-2)]">
              Sabab (majburiy)
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: omborga jo'natma uchun yetkazib bordim"
              rows={3}
              maxLength={500}
              autoFocus
            />
            <div className="text-[11px] text-[color:var(--ink-3)]">
              Kamida 3 ta belgi · {note.length}/500
            </div>
          </div>
        )}
      </div>
    </ModalContent>
  );
}

function SourceOption({
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
      className={cn(
        'flex w-full items-start gap-3 rounded-[12px] border px-3.5 py-3 text-left transition-colors',
        active
          ? 'border-primary bg-accent'
          : 'border-[color:var(--border)] hover:bg-[color:var(--background-2)]',
      )}
    >
      <span
        className={cn(
          'size-9 grid place-items-center rounded-[10px] shrink-0',
          active ? 'bg-primary text-primary-foreground' : 'bg-[color:var(--background-2)] text-[color:var(--ink-2)]',
        )}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="text-[12px] text-[color:var(--ink-3)] mt-0.5">{subtitle}</div>
      </div>
      <span
        className={cn(
          'size-[18px] rounded-full border-2 shrink-0 mt-1',
          active ? 'border-primary bg-primary' : 'border-[color:var(--border-2)]',
        )}
      >
        {active && <span className="block size-full rounded-full border-[3px] border-card" />}
      </span>
    </button>
  );
}

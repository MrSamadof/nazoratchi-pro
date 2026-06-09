'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  tone?: 'emerald' | 'rose' | 'accent';
}

const TONE_COLOR: Record<NonNullable<MapPoint['tone']>, string> = {
  emerald: '#10b981',
  rose: '#f43f5e',
  accent: '#6366f1',
};

function pinHtml(color: string): string {
  return `<span style="display:block;width:26px;height:26px;transform:translate(-50%,-100%)">
    <svg viewBox="0 0 24 24" width="26" height="26" fill="${color}" stroke="white" stroke-width="1.4"
      style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.7a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8z"/>
      <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
    </svg>
  </span>`;
}

/** Leaflet xaritasi — bir yoki bir nechta nuqtani marker bilan ko'rsatadi. */
export function LocationMap({
  points,
  className,
  zoom = 16,
}: {
  points: MapPoint[];
  className?: string;
  zoom?: number;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !ref.current || points.length === 0) return;

      map = L.map(ref.current, {
        scrollWheelZoom: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const latlngs = points.map((p) => {
        const icon = L.divIcon({
          html: pinHtml(TONE_COLOR[p.tone ?? 'accent']),
          className: '',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const marker = L.marker([p.lat, p.lng], { icon }).addTo(map!);
        if (p.label) marker.bindPopup(p.label);
        return [p.lat, p.lng] as [number, number];
      });

      if (latlngs.length === 1) {
        map.setView(latlngs[0], zoom);
      } else {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: zoom });
      }
      // Modal/konteyner o'lchami aniqlangach qayta hisoblash
      setTimeout(() => map?.invalidateSize(), 60);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, zoom]);

  return (
    <div className={cn('relative overflow-hidden rounded-[12px] bg-[color:var(--background-2)]', className)}>
      <div ref={ref} className="absolute inset-0 z-0" />
      {!ready && (
        <div className="absolute inset-0 z-10 grid place-items-center text-[color:var(--ink-3)]">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
    </div>
  );
}

/** "Xaritada" tugmasi — bosilganda modal ichida xaritani ochadi (talab bo'yicha yuklanadi). */
export function LocationMapButton({
  points,
  title = 'Joylashuv',
  subtitle,
  triggerClassName,
}: {
  points: MapPoint[];
  title?: string;
  subtitle?: string;
  triggerClassName?: string;
}): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  if (points.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-0.5 text-[11px] font-medium text-[color:var(--primary)] hover:underline shrink-0',
          triggerClassName,
        )}
      >
        <MapPin className="size-3" />
        Xaritada
      </button>
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent icon={<MapPin />} iconTone="accent" title={title} subtitle={subtitle} width={560}
          footer={
            <div className="flex justify-between gap-2">
              <a
                href={`https://www.google.com/maps?q=${points[0].lat},${points[0].lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12.5px] font-medium text-[color:var(--ink-2)] hover:text-foreground self-center"
              >
                Google Maps'da ochish ↗
              </a>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Yopish
              </Button>
            </div>
          }
        >
          {open && <LocationMap points={points} className="h-[340px]" />}
        </ModalContent>
      </Modal>
    </>
  );
}

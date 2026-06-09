import { logger } from '../logger/logger.js';

/**
 * Koordinatani odam o'qiy oladigan manzilga aylantiradi (reverse geocoding).
 *
 * OpenStreetMap Nominatim — bepul, API kalit talab qilmaydi. Past hajm uchun mos
 * (xodim kuniga 2 marta — kelish/ketish). Best-effort: xato yoki sekinlikda `null`
 * qaytaradi, hech qachon throw qilmaydi. Davomat oqimini bloklamaslik uchun
 * chaqiruvchi tomonda `void` (fire-and-forget) sifatida ishlatiladi.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 5_000;

interface NominatimAddress {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

interface NominatimResult {
  display_name?: string;
  address?: NominatimAddress;
}

/** Manzil bo'laklaridan qisqa, tushunarli satr yig'adi. */
function shorten(data: NominatimResult): string | null {
  const a = data.address;
  if (a) {
    const street = [a.road, a.house_number].filter(Boolean).join(', ');
    const area = a.neighbourhood ?? a.suburb ?? a.city_district;
    const city = a.city ?? a.town ?? a.village;
    const parts = [street, area, city].filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  if (data.display_name) {
    // Eng yaqin 3 bo'lakni olamiz (ko'cha · mahalla · shahar)
    return data.display_name.split(',').slice(0, 3).map((s) => s.trim()).join(', ');
  }
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=uz,ru`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Nominatim foydalanish siyosati haqiqiy User-Agent talab qiladi.
        'User-Agent': 'Nazoratchi-AI/1.0 (davomat manzili)',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    return shorten(data);
  } catch (err) {
    logger.warn({ err, lat, lng }, 'reverseGeocode muvaffaqiyatsiz');
    return null;
  } finally {
    clearTimeout(timer);
  }
}

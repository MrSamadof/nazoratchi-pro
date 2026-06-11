import { Store, type StoreDoc, type StoreKind } from './stores.model.js';
import type { Types } from 'mongoose';

/**
 * Bir xil slug bilan do'kon yaratishga urinilganda tashlanadi.
 * `deletedStore` — to'qnashgan do'kon yumshoq o'chirilganmi (isActive:false).
 * Slug indeksi global bo'lgani uchun o'chirilgan do'kon ham slug'ni band qiladi;
 * route shu xatoni ushlab, foydalanuvchiga tushunarli xabar beradi
 * (umumiy "Texnik xato" o'rniga).
 */
export class DuplicateSlugError extends Error {
  readonly deletedStore: boolean;
  constructor(deletedStore: boolean) {
    super(
      deletedStore
        ? 'Bu nomdagi do\'kon avval o\'chirilgan — boshqa nom (slug) tanlang yoki uni qayta tiklang'
        : 'Bu slug allaqachon ishlatilgan',
    );
    this.name = 'DuplicateSlugError';
    this.deletedStore = deletedStore;
  }
}

export interface StoreInput {
  name: string;
  slug: string;
  kind?: StoreKind;
  hasBillz?: boolean;
  billzUuid?: string | null;
  workStartTime?: string;
  workEndTime?: string;
  address?: string;
  phone?: string;
  location?: { lat: number; lng: number } | null;
  geofenceRadiusMeters?: number;
  weeklyTarget?: number;
  monthlyTarget?: number;
}

export class StoresService {
  async findAll(): Promise<StoreDoc[]> {
    return Store.find({ isActive: true }).sort({ name: 1 });
  }

  async findById(id: string | Types.ObjectId): Promise<StoreDoc | null> {
    return Store.findById(id);
  }

  async findBySlug(slug: string): Promise<StoreDoc | null> {
    return Store.findOne({ slug, isActive: true });
  }

  /** Slug bo'yicha qidiradi — yumshoq o'chirilgan do'konlarni ham qamraydi. */
  async findBySlugAny(slug: string): Promise<StoreDoc | null> {
    return Store.findOne({ slug });
  }

  async findBillzStores(): Promise<StoreDoc[]> {
    return Store.find({ hasBillz: true, isActive: true, billzUuid: { $ne: null } });
  }

  async create(input: StoreInput): Promise<StoreDoc> {
    // Slug indeksi global (o'chirilgan do'konlarni ham qamraydi) — shuning uchun
    // yaratishdan oldin har qanday holatdagi to'qnashuvni tekshiramiz. Bu raw
    // E11000 ni "Texnik xato"ga aylanishidan saqlaydi.
    const clash = await this.findBySlugAny(input.slug);
    if (clash) {
      throw new DuplicateSlugError(!clash.isActive);
    }
    return Store.create({
      name: input.name,
      slug: input.slug,
      kind: input.kind ?? 'store',
      // Ofis savdo bilan ishlamaydi — Billz har doim o'chiq.
      hasBillz: input.kind === 'office' ? false : (input.hasBillz ?? false),
      billzUuid: input.billzUuid ?? null,
      workStartTime: input.workStartTime ?? '09:00',
      workEndTime: input.workEndTime ?? '18:00',
      address: input.address ?? '',
      phone: input.phone ?? '',
      location: input.location ?? { lat: null, lng: null },
      geofenceRadiusMeters: input.geofenceRadiusMeters ?? 100,
      weeklyTarget: input.weeklyTarget ?? 0,
      monthlyTarget: input.monthlyTarget ?? 0,
      isActive: true,
    });
  }

  async update(id: string | Types.ObjectId, input: Partial<StoreInput>): Promise<StoreDoc | null> {
    // Ofisga aylantirilsa — Billz va savdo maqsadlari mantiqsiz, tozalanadi.
    const patch: Partial<StoreInput> = { ...input };
    if (input.kind === 'office') {
      patch.hasBillz = false;
      patch.billzUuid = null;
    }
    return Store.findByIdAndUpdate(id, patch, { new: true });
  }

  async deactivate(id: string | Types.ObjectId): Promise<StoreDoc | null> {
    return Store.findByIdAndUpdate(
      id,
      { isActive: false, deletedAt: new Date() },
      { new: true },
    );
  }
}

export const storesService = new StoresService();

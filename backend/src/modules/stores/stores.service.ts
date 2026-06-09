import { Store, type StoreDoc, type StoreKind } from './stores.model.js';
import type { Types } from 'mongoose';

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

  async findBillzStores(): Promise<StoreDoc[]> {
    return Store.find({ hasBillz: true, isActive: true, billzUuid: { $ne: null } });
  }

  async create(input: StoreInput): Promise<StoreDoc> {
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

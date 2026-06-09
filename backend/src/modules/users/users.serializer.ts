import type { usersService } from './users.service.js';

type AnyUser = Awaited<ReturnType<typeof usersService.findById>>;

/** User hujjatini API javobiga aylantiradi (ceo + admin route'lari uchun umumiy). */
export function serializeUser(u: AnyUser) {
  if (!u) return null;
  const store = u.storeId as unknown as
    | { _id: { toString(): string }; name: string; slug?: string }
    | null;
  return {
    id: u._id.toString(),
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    division: u.division ?? null,
    defaultShiftType: u.defaultShiftType ?? null,
    defaultShiftStartTime: u.defaultShiftStartTime ?? null,
    defaultShiftEndTime: u.defaultShiftEndTime ?? null,
    isActive: u.isActive,
    isApproved: u.isApproved,
    storeId:
      store && typeof store === 'object' && 'name' in store
        ? store._id.toString()
        : u.storeId
          ? u.storeId.toString()
          : null,
    storeName: store && typeof store === 'object' && 'name' in store ? store.name : null,
    telegramId: u.telegramId,
    telegramUsername: u.telegramUsername,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    deletedAt: u.deletedAt,
  };
}

import bcrypt from 'bcrypt';
import { Types, type FilterQuery } from 'mongoose';
import { User, type UserDoc, type UserRole, type UserType } from './users.model.js';
import { Session } from '../auth/auth.model.js';
import { env } from '../../core/config/env.js';
import type { CreateUserDto, UpdateUserDto } from './users.dto.js';

export class UsersError extends Error {
  constructor(
    public readonly code:
      | 'PHONE_TAKEN'
      | 'NOT_FOUND'
      | 'INVALID_ID'
      | 'CANNOT_MODIFY_SELF',
    message: string,
  ) {
    super(message);
    this.name = 'UsersError';
  }
}

export interface UserListFilters {
  role?: UserRole;
  storeId?: string;
  isActive?: boolean;
  isApproved?: boolean;
  search?: string;
  includeDeleted?: boolean;
}

export interface UserListResult {
  total: number;
  page: number;
  limit: number;
  users: UserDoc[];
}

export class UsersService {
  async findByTelegramId(telegramId: number): Promise<UserDoc | null> {
    return User.findOne({ telegramId });
  }

  async findByPhone(phone: string): Promise<UserDoc | null> {
    if (!phone) return null;
    return User.findOne({ phone });
  }

  async findById(id: string | Types.ObjectId): Promise<UserDoc | null> {
    return User.findById(id);
  }

  async findByStore(storeId: Types.ObjectId): Promise<UserDoc[]> {
    return User.find({ storeId, isActive: true });
  }

  /**
   * Boshqaruv guruhi — menejer va CEO.
   */
  async findManagers(): Promise<UserDoc[]> {
    return User.find({
      role: { $in: ['manager', 'ceo'] },
      isActive: true,
    });
  }

  async list(filters: UserListFilters, page = 1, limit = 20): Promise<UserListResult> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const query: FilterQuery<UserType> = {};
    if (filters.role) query.role = filters.role;
    if (filters.storeId) query.storeId = new Types.ObjectId(filters.storeId);
    if (typeof filters.isActive === 'boolean') query.isActive = filters.isActive;
    if (typeof filters.isApproved === 'boolean') query.isApproved = filters.isApproved;
    if (!filters.includeDeleted && typeof filters.isActive !== 'boolean') {
      query.isActive = true;
    }
    if (filters.search) {
      const term = filters.search.trim();
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(safe, 'i');
      query.$or = [{ firstName: re }, { lastName: re }, { phone: re }];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .populate('storeId', 'name slug')
        .sort({ lastName: 1, firstName: 1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
    ]);

    return { total, page: safePage, limit: safeLimit, users };
  }

  async create(dto: CreateUserDto): Promise<UserDoc> {
    const phoneTaken = await User.findOne({ phone: dto.phone });
    if (phoneTaken) {
      throw new UsersError(
        'PHONE_TAKEN',
        "Bu telefon raqam allaqachon ro'yxatda mavjud",
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);
    // Faqat CEO do'kon/ofisga biriktirilmaydi. Menejer ham do'kon yoki ofisga
    // ulanadi (kelish/ketish davomatini topshirishi uchun).
    const isCeo = dto.role === 'ceo';
    return User.create({
      firstName: dto.firstName,
      lastName: dto.lastName ?? '',
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      storeId: isCeo ? null : (dto.storeId ?? null),
      division: dto.division ?? null,
      // CEO do'konda ishlamaydi — smena biriktirilmaydi; menejer/sotuvchiga mumkin.
      defaultShiftType: isCeo ? null : (dto.defaultShiftType ?? null),
      defaultShiftStartTime:
        !isCeo && dto.defaultShiftType === 'custom' ? (dto.defaultShiftStartTime ?? null) : null,
      defaultShiftEndTime:
        !isCeo && dto.defaultShiftType === 'custom' ? (dto.defaultShiftEndTime ?? null) : null,
      isApproved: dto.isApproved,
      isActive: dto.isActive,
    });
  }

  async update(
    id: string | Types.ObjectId,
    dto: UpdateUserDto,
  ): Promise<UserDoc | null> {
    if (dto.phone) {
      const conflict = await User.findOne({ phone: dto.phone, _id: { $ne: id } });
      if (conflict) {
        throw new UsersError(
          'PHONE_TAKEN',
          'Bu telefon raqam boshqa foydalanuvchida ishlatilgan',
        );
      }
    }

    const patch: Record<string, unknown> = { ...dto };
    if ('storeId' in dto) {
      patch.storeId = dto.storeId ? new Types.ObjectId(dto.storeId) : null;
    }
    // Smena soatlari — faqat 'custom' bo'lganda saqlanadi, aks holda tozalanadi.
    if ('defaultShiftType' in dto) {
      if (dto.defaultShiftType === 'custom') {
        patch.defaultShiftStartTime = dto.defaultShiftStartTime ?? null;
        patch.defaultShiftEndTime = dto.defaultShiftEndTime ?? null;
      } else {
        patch.defaultShiftStartTime = null;
        patch.defaultShiftEndTime = null;
      }
    }
    // Faqat CEO do'kon/ofisga biriktirilmaydi. Yangilanishdan keyingi amaldagi
    // rolni aniqlab (dto'da bo'lmasa bazadan), CEO bo'lsa storeId tozalanadi.
    let effectiveRole = dto.role;
    if (effectiveRole === undefined && 'storeId' in dto) {
      const existing = await User.findById(id).select('role');
      effectiveRole = existing?.role;
    }
    if (effectiveRole === 'ceo') {
      patch.storeId = null;
      // CEO — do'kon ham, smena ham biriktirilmaydi.
      patch.defaultShiftType = null;
      patch.defaultShiftStartTime = null;
      patch.defaultShiftEndTime = null;
    }
    if (dto.isActive === true) {
      patch.deletedAt = null;
    }
    if (dto.isActive === false) {
      patch.deletedAt = new Date();
    }
    return User.findByIdAndUpdate(id, patch, { new: true });
  }

  async resetPin(
    id: string | Types.ObjectId,
    newPin: string,
  ): Promise<UserDoc | null> {
    const passwordHash = await bcrypt.hash(newPin, env.BCRYPT_ROUNDS);
    return User.findByIdAndUpdate(
      id,
      {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      { new: true },
    );
  }

  async setRole(userId: Types.ObjectId, role: UserRole): Promise<UserDoc | null> {
    return User.findByIdAndUpdate(userId, { role }, { new: true });
  }

  async approve(userId: Types.ObjectId): Promise<UserDoc | null> {
    return User.findByIdAndUpdate(userId, { isApproved: true }, { new: true });
  }

  async deactivate(userId: Types.ObjectId): Promise<UserDoc | null> {
    const updated = await User.findByIdAndUpdate(
      userId,
      { isActive: false, deletedAt: new Date() },
      { new: true },
    );
    if (updated) {
      // Aktiv sessiyalarni bekor qilamiz — deaktivatsiyalangan user kira olmaydi
      await Session.updateMany(
        { userId, revokedAt: null },
        { revokedAt: new Date() },
      );
    }
    return updated;
  }

  async restore(userId: Types.ObjectId): Promise<UserDoc | null> {
    return User.findByIdAndUpdate(
      userId,
      { isActive: true, deletedAt: null },
      { new: true },
    );
  }
}

export const usersService = new UsersService();

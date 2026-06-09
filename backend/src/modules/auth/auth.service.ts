import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { Session, type SessionDoc } from './auth.model.js';
import { User, type UserDoc } from '../users/users.model.js';
import { env } from '../../core/config/env.js';
import { AUTH } from '../../core/config/constants.js';
import { logger } from '../../core/logger/logger.js';
import type { RegisterDto, LoginDto } from './auth.dto.js';

export class AuthError extends Error {
  constructor(
    public readonly code:
      | 'ALREADY_REGISTERED'
      | 'NOT_FOUND'
      | 'WRONG_PASSWORD'
      | 'LOCKED'
      | 'NOT_APPROVED'
      | 'INACTIVE',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

type SessionMeta = {
  userAgent?: string;
  ipAddress?: string;
};

export class AuthService {
  /**
   * Yangi foydalanuvchini ro'yxatdan o'tkazadi.
   * `isApproved: false` — admin tasdiqlamaguncha tizimga kira olmaydi.
   */
  async register(dto: RegisterDto): Promise<UserDoc> {
    const phoneTaken = await User.findOne({ phone: dto.phone });
    if (phoneTaken) {
      throw new AuthError(
        'ALREADY_REGISTERED',
        'Bu telefon raqam bilan allaqachon ro\'yxatdan o\'tilgan. Tizimga kiring.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, env.BCRYPT_ROUNDS);

    const user = await User.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      passwordHash,
      role: 'employee',
      storeId: dto.storeId,
      isApproved: false,
      isActive: true,
    });

    logger.info(
      { userId: user._id.toString(), phone: user.phone },
      'Yangi foydalanuvchi ro\'yxatdan o\'tdi (tasdiq kutilmoqda)',
    );
    return user;
  }

  /**
   * Login — telefon + PIN tekshirib, yangi sessiya yaratadi.
   */
  async login(dto: LoginDto, meta: SessionMeta = {}): Promise<{ user: UserDoc; session: SessionDoc }> {
    const user = await User.findOne({ phone: dto.phone });
    if (!user) {
      throw new AuthError('NOT_FOUND', 'Bu telefon raqam bilan ro\'yxatdan o\'tilmagan');
    }

    if (!user.isActive) {
      throw new AuthError('INACTIVE', 'Hisobingiz faolsizlantirilgan. Menejer bilan bog\'laning');
    }

    if (this.isLockedOut(user)) {
      const minutes = Math.ceil(
        ((user.lockedUntil?.getTime() ?? 0) - Date.now()) / 60_000,
      );
      throw new AuthError('LOCKED', `Ko'p marta xato. ${minutes} daqiqa kuting`);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(user);
      throw new AuthError('WRONG_PASSWORD', 'PIN noto\'g\'ri');
    }

    if (!user.isApproved) {
      throw new AuthError('NOT_APPROVED', 'Hisobingiz hali admin tomonidan tasdiqlanmagan');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const expiresAt = this.computeExpiresAt(env.SESSION_EXPIRES_IN);
    const session = await Session.create({
      userId: user._id,
      token: randomBytes(32).toString('hex'),
      expiresAt,
      userAgent: meta.userAgent ?? '',
      ipAddress: meta.ipAddress ?? '',
    });

    return { user, session };
  }

  /**
   * Sessiyani bekor qiladi (logout).
   */
  async logout(token: string): Promise<void> {
    await Session.updateOne(
      { token, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  /**
   * Sessiya token bo'yicha aktiv user va sessiyani topadi.
   * Middleware va `/api/auth/session` shu funksiyani chaqiradi.
   */
  async findActiveSessionByToken(
    token: string,
  ): Promise<{ user: UserDoc; session: SessionDoc } | null> {
    const session = await Session.findOne({
      token,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!session) return null;

    const user = await User.findById(session.userId);
    if (!user || !user.isActive) return null;

    session.lastUsedAt = new Date();
    await session.save();

    return { user, session };
  }

  /**
   * Tasdiqlangan CEO larni qaytaradi (notifikatsiyalar uchun).
   */
  async findCEOs(): Promise<UserDoc[]> {
    return User.find({
      role: 'ceo',
      isActive: true,
      isApproved: true,
    });
  }

  /**
   * Foydalanuvchini tasdiqlash (admin tomonidan).
   */
  async approveUser(userId: Types.ObjectId, approvedBy: Types.ObjectId): Promise<UserDoc | null> {
    const user = await User.findByIdAndUpdate(userId, { isApproved: true }, { new: true });
    if (user) {
      logger.info(
        { userId: userId.toString(), approvedBy: approvedBy.toString() },
        'Foydalanuvchi tasdiqlandi',
      );
    }
    return user;
  }

  async rejectUser(userId: Types.ObjectId, rejectedBy: Types.ObjectId): Promise<UserDoc | null> {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false, deletedAt: new Date() },
      { new: true },
    );
    if (user) {
      logger.info(
        { userId: userId.toString(), rejectedBy: rejectedBy.toString() },
        'Foydalanuvchi rad etildi',
      );
    }
    return user;
  }

  // --- Private helpers ---

  private isLockedOut(user: UserDoc): boolean {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  }

  private async recordFailedLogin(user: UserDoc): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= AUTH.MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + AUTH.LOCKOUT_MINUTES * 60_000);
      user.failedLoginAttempts = 0;
      logger.warn({ userId: user._id.toString() }, 'Foydalanuvchi blokirovka qilindi');
    }
    await user.save();
  }

  private computeExpiresAt(expiresIn: string): Date {
    // "7d", "24h", "30m" formatini parse qiladi
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;
    const ms = unit === 'd' ? value * 86_400_000 : unit === 'h' ? value * 3_600_000 : value * 60_000;
    return new Date(Date.now() + ms);
  }
}

export const authService = new AuthService();

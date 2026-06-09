import { describe, expect, it } from 'vitest';
import { authService, AuthError } from '../src/modules/auth/auth.service.js';
import { User } from '../src/modules/users/users.model.js';
import { Session } from '../src/modules/auth/auth.model.js';
import { AUTH } from '../src/core/config/constants.js';

const baseRegister = {
  firstName: 'Ali',
  lastName: 'Valiyev',
  phone: '998901234567',
  password: '1234',
  storeId: '507f1f77bcf86cd799439011',
};

/** Register, then force the user approved so login can succeed. */
async function approvedUser(overrides: Partial<typeof baseRegister> = {}) {
  const user = await authService.register({ ...baseRegister, ...overrides });
  user.isApproved = true;
  await user.save();
  return user;
}

describe('AuthService.register', () => {
  it('creates an unapproved employee with a hashed password', async () => {
    const user = await authService.register(baseRegister);

    expect(user.role).toBe('employee');
    expect(user.isApproved).toBe(false);
    expect(user.isActive).toBe(true);
    // password must be hashed, never stored in plaintext.
    expect(user.passwordHash).not.toBe(baseRegister.password);

    const inDb = await User.findOne({ phone: baseRegister.phone });
    expect(inDb).not.toBeNull();
    expect(inDb!.isApproved).toBe(false);
  });

  it('rejects a duplicate phone number with ALREADY_REGISTERED', async () => {
    await authService.register(baseRegister);

    await expect(authService.register(baseRegister)).rejects.toMatchObject({
      name: 'AuthError',
      code: 'ALREADY_REGISTERED',
    });

    expect(await User.countDocuments({ phone: baseRegister.phone })).toBe(1);
  });
});

describe('AuthService.login', () => {
  it('logs in with correct phone + PIN and creates a session', async () => {
    const user = await approvedUser();

    const { user: loggedIn, session } = await authService.login({
      phone: baseRegister.phone,
      password: baseRegister.password,
    });

    expect(loggedIn._id.toString()).toBe(user._id.toString());
    expect(session.token).toHaveLength(64); // 32 random bytes hex
    expect(session.userId.toString()).toBe(user._id.toString());

    const sessionInDb = await Session.findOne({ token: session.token });
    expect(sessionInDb).not.toBeNull();

    // failed-attempt counter reset + lastLoginAt stamped on success.
    const refreshed = await User.findById(user._id);
    expect(refreshed!.failedLoginAttempts).toBe(0);
    expect(refreshed!.lastLoginAt).not.toBeNull();
  });

  it('rejects an unknown phone with NOT_FOUND', async () => {
    await expect(
      authService.login({ phone: '998000000000', password: '1234' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects an approved user with the wrong PIN as WRONG_PASSWORD', async () => {
    await approvedUser();

    await expect(
      authService.login({ phone: baseRegister.phone, password: '9999' }),
    ).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });

    // a failed attempt was recorded, no session created.
    const user = await User.findOne({ phone: baseRegister.phone });
    expect(user!.failedLoginAttempts).toBe(1);
    expect(await Session.countDocuments({})).toBe(0);
  });

  it('blocks an unapproved user with NOT_APPROVED even when the PIN is correct', async () => {
    // registered but never approved.
    await authService.register(baseRegister);

    await expect(
      authService.login({ phone: baseRegister.phone, password: baseRegister.password }),
    ).rejects.toMatchObject({ code: 'NOT_APPROVED' });

    expect(await Session.countDocuments({})).toBe(0);
  });

  it(`locks the account after ${AUTH.MAX_FAILED_ATTEMPTS} wrong PINs`, async () => {
    await approvedUser();

    // Drive failed attempts up to the limit — each wrong PIN throws WRONG_PASSWORD.
    for (let i = 0; i < AUTH.MAX_FAILED_ATTEMPTS; i++) {
      await expect(
        authService.login({ phone: baseRegister.phone, password: '0000' }),
      ).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
    }

    const locked = await User.findOne({ phone: baseRegister.phone });
    expect(locked!.lockedUntil).not.toBeNull();
    expect(locked!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // Now even the CORRECT PIN is refused with LOCKED until the lockout expires.
    await expect(
      authService.login({ phone: baseRegister.phone, password: baseRegister.password }),
    ).rejects.toMatchObject({ code: 'LOCKED' });
  });

  it('rejects a deactivated account with INACTIVE', async () => {
    const user = await approvedUser();
    user.isActive = false;
    await user.save();

    await expect(
      authService.login({ phone: baseRegister.phone, password: baseRegister.password }),
    ).rejects.toBeInstanceOf(AuthError);
    await expect(
      authService.login({ phone: baseRegister.phone, password: baseRegister.password }),
    ).rejects.toMatchObject({ code: 'INACTIVE' });
  });
});

describe('AuthService.findActiveSessionByToken', () => {
  it('returns the user for a live token and null after logout', async () => {
    await approvedUser();
    const { session } = await authService.login({
      phone: baseRegister.phone,
      password: baseRegister.password,
    });

    const active = await authService.findActiveSessionByToken(session.token);
    expect(active).not.toBeNull();
    expect(active!.user.phone).toBe(baseRegister.phone);

    await authService.logout(session.token);

    expect(await authService.findActiveSessionByToken(session.token)).toBeNull();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { usersService } from '../src/modules/users/users.service.js';
import { User } from '../src/modules/users/users.model.js';

afterEach(async () => {
  await User.deleteMany({});
});

const base = {
  firstName: 'Aziz',
  lastName: '',
  password: '1234',
  role: 'employee' as const,
  isApproved: true,
  isActive: true,
};

describe('UsersService custom shift persistence', () => {
  it('stores custom hours on create', async () => {
    const u = await usersService.create({
      ...base,
      phone: '998900000001',
      defaultShiftType: 'custom',
      defaultShiftStartTime: '10:00',
      defaultShiftEndTime: '20:00',
    });
    expect(u.defaultShiftType).toBe('custom');
    expect(u.defaultShiftStartTime).toBe('10:00');
    expect(u.defaultShiftEndTime).toBe('20:00');
  });

  it('clears custom hours when switching to a template shift', async () => {
    const u = await usersService.create({
      ...base,
      phone: '998900000002',
      defaultShiftType: 'custom',
      defaultShiftStartTime: '10:00',
      defaultShiftEndTime: '20:00',
    });
    const updated = await usersService.update(u._id, { defaultShiftType: 'morning' });
    expect(updated!.defaultShiftType).toBe('morning');
    expect(updated!.defaultShiftStartTime).toBeNull();
    expect(updated!.defaultShiftEndTime).toBeNull();
  });
});

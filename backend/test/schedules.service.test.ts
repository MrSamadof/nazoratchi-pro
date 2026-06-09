import { afterEach, describe, expect, it } from 'vitest';
import { schedulesService } from '../src/modules/schedules/schedules.service.js';
import { appSettingsService } from '../src/modules/app-settings/app-settings.service.js';
import { AppSettings } from '../src/modules/app-settings/app-settings.model.js';
import { User, type UserDoc } from '../src/modules/users/users.model.js';

afterEach(async () => {
  await Promise.all([User.deleteMany({}), AppSettings.deleteMany({})]);
  appSettingsService.invalidate();
});

async function makeUser(over: Record<string, unknown> = {}): Promise<UserDoc> {
  return (await User.create({
    firstName: 'X',
    phone: `9989${Math.floor(Math.random() * 1e7)}`,
    passwordHash: 'x',
    role: 'employee',
    isApproved: true,
    isActive: true,
    ...over,
  })) as UserDoc;
}

describe('schedulesService.getShiftWindow', () => {
  it('resolves a template shift from the DB-edited times', async () => {
    await appSettingsService.updateShiftsConfig(
      { morning: { label: 'Ertalabki', startTime: '09:00', endTime: '19:00' } },
      null,
    );
    const user = await makeUser({ defaultShiftType: 'morning' });
    const win = await schedulesService.getShiftWindow(user._id);
    expect(win.resolved).toBe(true);
    expect(win.startTime).toBe('09:00');
    expect(win.endTime).toBe('19:00');
    expect(win.fixed).toBe(true);
  });

  it('resolves a custom shift from the user own hours', async () => {
    const user = await makeUser({
      defaultShiftType: 'custom',
      defaultShiftStartTime: '10:30',
      defaultShiftEndTime: '20:30',
    });
    const win = await schedulesService.getShiftWindow(user._id);
    expect(win.shiftType).toBe('custom');
    expect(win.startTime).toBe('10:30');
    expect(win.endTime).toBe('20:30');
    expect(win.fixed).toBe(true);
  });

  it('keeps flexible without fixed times', async () => {
    const user = await makeUser({ defaultShiftType: 'flexible' });
    const win = await schedulesService.getShiftWindow(user._id);
    expect(win.startTime).toBeNull();
    expect(win.fixed).toBe(false);
  });
});

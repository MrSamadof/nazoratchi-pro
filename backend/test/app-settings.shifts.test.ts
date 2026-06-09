import { afterEach, describe, expect, it } from 'vitest';
import { appSettingsService } from '../src/modules/app-settings/app-settings.service.js';
import { AppSettings } from '../src/modules/app-settings/app-settings.model.js';

afterEach(async () => {
  await AppSettings.deleteMany({});
  appSettingsService.invalidate();
});

describe('AppSettingsService shift templates', () => {
  it('returns constants defaults when nothing is stored', async () => {
    const cfg = await appSettingsService.getShiftsConfig();
    expect(cfg.morning.startTime).toBe('08:00');
    expect(cfg.evening.endTime).toBe('23:00');
    expect(cfg.flexible.startTime).toBeNull();
  });

  it('persists and reads back an edited template', async () => {
    await appSettingsService.updateShiftsConfig(
      { morning: { label: 'Ertalabki', startTime: '09:00', endTime: '19:00' } },
      null,
    );
    const cfg = await appSettingsService.getShiftsConfig();
    expect(cfg.morning.startTime).toBe('09:00');
    expect(cfg.morning.endTime).toBe('19:00');
    expect(cfg.evening.startTime).toBe('13:00');
  });
});

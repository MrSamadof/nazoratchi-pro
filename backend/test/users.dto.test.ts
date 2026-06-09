import { describe, expect, it } from 'vitest';
import { createUserDto } from '../src/modules/users/users.dto.js';

const base = {
  firstName: 'Aziz',
  phone: '998901234567',
  password: '1234',
  role: 'employee' as const,
};

describe('createUserDto custom shift validation', () => {
  it('accepts a custom shift with both times', () => {
    const parsed = createUserDto.parse({
      ...base,
      defaultShiftType: 'custom',
      defaultShiftStartTime: '09:00',
      defaultShiftEndTime: '18:00',
    });
    expect(parsed.defaultShiftStartTime).toBe('09:00');
  });

  it('rejects a custom shift missing the end time', () => {
    expect(() =>
      createUserDto.parse({
        ...base,
        defaultShiftType: 'custom',
        defaultShiftStartTime: '09:00',
      }),
    ).toThrow();
  });

  it('rejects a custom shift where start >= end', () => {
    expect(() =>
      createUserDto.parse({
        ...base,
        defaultShiftType: 'custom',
        defaultShiftStartTime: '18:00',
        defaultShiftEndTime: '09:00',
      }),
    ).toThrow();
  });

  it('accepts a normal template shift without custom times', () => {
    const parsed = createUserDto.parse({ ...base, defaultShiftType: 'morning' });
    expect(parsed.defaultShiftType).toBe('morning');
  });
});

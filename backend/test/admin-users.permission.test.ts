import { describe, expect, it } from 'vitest';
import { canManageAsEmployee } from '../api/routes/admin.js';

describe('canManageAsEmployee', () => {
  it('allows undefined (no role change)', () => {
    expect(canManageAsEmployee(undefined)).toBe(true);
  });
  it('allows employee', () => {
    expect(canManageAsEmployee('employee')).toBe(true);
  });
  it('blocks manager and ceo', () => {
    expect(canManageAsEmployee('manager')).toBe(false);
    expect(canManageAsEmployee('ceo')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  UserRole,
  ROLE_PERMISSIONS,
  type Permission,
} from './roles';

describe('FR-F004: UserRole enum and permissions', () => {
  it('FR-F004: defines all 5 required roles', () => {
    expect(UserRole.ADMIN).toBe('admin');
    expect(UserRole.MANAGER).toBe('manager');
    expect(UserRole.REP).toBe('rep');
    expect(UserRole.LOGISTICS).toBe('logistics');
    expect(UserRole.VIEWER).toBe('viewer');
  });

  it('FR-F004: UserRole has exactly 5 values', () => {
    const values = Object.values(UserRole);
    expect(values).toHaveLength(5);
  });

  it('FR-F004: ROLE_PERMISSIONS maps every role', () => {
    const roles = Object.values(UserRole);
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it('US3-AC5: Admin has all permissions', () => {
    const adminPerms = ROLE_PERMISSIONS[UserRole.ADMIN];
    expect(adminPerms).toContain('*');
  });

  it('US3-AC6: Viewer has read-only permissions', () => {
    const viewerPerms = ROLE_PERMISSIONS[UserRole.VIEWER];
    expect(viewerPerms.every((p: Permission) => p.startsWith('read:') || p === 'read:*')).toBe(
      true,
    );
  });

  it('FR-F004: Rep permissions include account and order operations', () => {
    const repPerms = ROLE_PERMISSIONS[UserRole.REP];
    expect(repPerms).toContain('read:accounts');
    expect(repPerms).toContain('write:accounts');
    expect(repPerms).toContain('read:orders');
    expect(repPerms).toContain('write:orders');
  });

  it('FR-F004: Logistics has order fulfillment but not commission access', () => {
    const logisticsPerms = ROLE_PERMISSIONS[UserRole.LOGISTICS];
    expect(logisticsPerms).toContain('read:orders');
    expect(logisticsPerms).not.toContain('read:commissions');
    expect(logisticsPerms).not.toContain('write:commissions');
  });
});

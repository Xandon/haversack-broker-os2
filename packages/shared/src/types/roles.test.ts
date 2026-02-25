/**
 * RBAC permission matrix unit tests.
 * T037: RBAC tests — role permissions validation.
 */
import { describe, expect, test } from 'vitest';

import {
  ROLES,
  ROLE_PERMISSIONS,
  roleHasPermission,
  type UserRole,
} from './roles.js';

describe('Role Permission Matrix', () => {
  test('FR-002: defines exactly 5 roles', () => {
    expect(ROLES).toHaveLength(5);
    expect(ROLES).toEqual(['admin', 'manager', 'rep', 'logistics', 'viewer']);
  });

  test('FR-002: admin has all permissions', () => {
    const adminPerms = ROLE_PERMISSIONS.admin;
    expect(adminPerms).toContain('create');
    expect(adminPerms).toContain('read');
    expect(adminPerms).toContain('update');
    expect(adminPerms).toContain('delete');
    expect(adminPerms).toContain('approve');
    expect(adminPerms).toContain('export');
    expect(adminPerms).toContain('manage_users');
    expect(adminPerms).toContain('manage_settings');
    expect(adminPerms).toContain('view_all_territories');
    expect(adminPerms).toContain('approve_commissions');
    expect(adminPerms).toContain('approve_orders');
  });

  test('FR-002: manager cannot delete or manage settings', () => {
    expect(roleHasPermission('manager', 'delete')).toBe(false);
    expect(roleHasPermission('manager', 'manage_settings')).toBe(false);
  });

  test('FR-002: manager can approve orders and commissions', () => {
    expect(roleHasPermission('manager', 'approve_orders')).toBe(true);
    expect(roleHasPermission('manager', 'approve_commissions')).toBe(true);
  });

  test('FR-002: rep can create, read, update but not delete or approve', () => {
    expect(roleHasPermission('rep', 'create')).toBe(true);
    expect(roleHasPermission('rep', 'read')).toBe(true);
    expect(roleHasPermission('rep', 'update')).toBe(true);
    expect(roleHasPermission('rep', 'delete')).toBe(false);
    expect(roleHasPermission('rep', 'approve')).toBe(false);
    expect(roleHasPermission('rep', 'approve_orders')).toBe(false);
  });

  test('FR-002: rep can view own territory and commissions', () => {
    expect(roleHasPermission('rep', 'view_own_territory')).toBe(true);
    expect(roleHasPermission('rep', 'view_commissions')).toBe(true);
  });

  test('FR-002: rep cannot view all territories', () => {
    expect(roleHasPermission('rep', 'view_all_territories')).toBe(false);
  });

  test('FR-002: logistics can read, update, export, view all territories', () => {
    expect(roleHasPermission('logistics', 'read')).toBe(true);
    expect(roleHasPermission('logistics', 'update')).toBe(true);
    expect(roleHasPermission('logistics', 'export')).toBe(true);
    expect(roleHasPermission('logistics', 'view_all_territories')).toBe(true);
  });

  test('FR-002: logistics cannot create or delete', () => {
    expect(roleHasPermission('logistics', 'create')).toBe(false);
    expect(roleHasPermission('logistics', 'delete')).toBe(false);
  });

  test('FR-002: viewer is read-only', () => {
    expect(roleHasPermission('viewer', 'read')).toBe(true);
    expect(roleHasPermission('viewer', 'view_own_territory')).toBe(true);
    expect(roleHasPermission('viewer', 'create')).toBe(false);
    expect(roleHasPermission('viewer', 'update')).toBe(false);
    expect(roleHasPermission('viewer', 'delete')).toBe(false);
    expect(roleHasPermission('viewer', 'approve')).toBe(false);
    expect(roleHasPermission('viewer', 'export')).toBe(false);
  });

  test('FR-002: roleHasPermission correctly returns boolean for all roles', () => {
    for (const role of ROLES) {
      // Every role should have 'read' permission
      expect(roleHasPermission(role, 'read')).toBe(true);
    }
  });

  test('FR-002: only admin can manage users', () => {
    const rolesWithManageUsers: UserRole[] = ROLES.filter((r) =>
      roleHasPermission(r, 'manage_users'),
    );
    expect(rolesWithManageUsers).toEqual(['admin']);
  });
});

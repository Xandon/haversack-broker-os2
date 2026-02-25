/**
 * User role definitions and permission matrix for RBAC enforcement.
 * 5 roles: admin, manager, rep, logistics, viewer
 * Used across backend auth middleware and frontend route guards.
 */

export type UserRole = 'admin' | 'manager' | 'rep' | 'logistics' | 'viewer';

export const ROLES: readonly UserRole[] = [
  'admin',
  'manager',
  'rep',
  'logistics',
  'viewer',
] as const;

/**
 * Permission actions available in the system.
 */
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'
  | 'manage_users'
  | 'manage_settings'
  | 'view_all_territories'
  | 'view_own_territory'
  | 'view_commissions'
  | 'approve_commissions'
  | 'approve_orders';

/**
 * Permission matrix mapping roles to their allowed actions.
 */
export type RolePermissionMatrix = Record<UserRole, readonly PermissionAction[]>;

export const ROLE_PERMISSIONS: RolePermissionMatrix = {
  admin: [
    'create',
    'read',
    'update',
    'delete',
    'approve',
    'export',
    'manage_users',
    'manage_settings',
    'view_all_territories',
    'view_own_territory',
    'view_commissions',
    'approve_commissions',
    'approve_orders',
  ],
  manager: [
    'create',
    'read',
    'update',
    'approve',
    'export',
    'view_all_territories',
    'view_own_territory',
    'view_commissions',
    'approve_commissions',
    'approve_orders',
  ],
  rep: [
    'create',
    'read',
    'update',
    'view_own_territory',
    'view_commissions',
  ],
  logistics: [
    'read',
    'update',
    'export',
    'view_all_territories',
  ],
  viewer: [
    'read',
    'view_own_territory',
  ],
} as const;

/**
 * Check whether a role has a specific permission.
 */
export function roleHasPermission(role: UserRole, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(action);
}

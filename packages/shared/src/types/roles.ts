export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  REP: 'rep',
  LOGISTICS: 'logistics',
  VIEWER: 'viewer',
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

export type Permission =
  | '*'
  | 'read:*'
  | 'read:accounts'
  | 'write:accounts'
  | 'delete:accounts'
  | 'read:orders'
  | 'write:orders'
  | 'approve:orders'
  | 'read:commissions'
  | 'write:commissions'
  | 'read:activities'
  | 'write:activities'
  | 'read:pipeline'
  | 'write:pipeline'
  | 'read:products'
  | 'write:products'
  | 'read:reports'
  | 'read:users'
  | 'write:users'
  | 'read:settings'
  | 'write:settings';

export const ROLE_PERMISSIONS: Record<UserRoleValue, Permission[]> = {
  [UserRole.ADMIN]: ['*'],
  [UserRole.MANAGER]: [
    'read:accounts',
    'write:accounts',
    'delete:accounts',
    'read:orders',
    'write:orders',
    'approve:orders',
    'read:commissions',
    'write:commissions',
    'read:activities',
    'write:activities',
    'read:pipeline',
    'write:pipeline',
    'read:products',
    'write:products',
    'read:reports',
    'read:users',
    'write:users',
    'read:settings',
  ],
  [UserRole.REP]: [
    'read:accounts',
    'write:accounts',
    'read:orders',
    'write:orders',
    'read:commissions',
    'read:activities',
    'write:activities',
    'read:pipeline',
    'write:pipeline',
    'read:products',
    'read:reports',
  ],
  [UserRole.LOGISTICS]: [
    'read:accounts',
    'read:orders',
    'write:orders',
    'read:products',
    'read:activities',
    'write:activities',
  ],
  [UserRole.VIEWER]: [
    'read:*',
  ],
};

export function hasPermission(
  role: UserRoleValue,
  permission: Permission,
): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes('*')) return true;
  if (perms.includes('read:*') && permission.startsWith('read:')) return true;
  return perms.includes(permission);
}

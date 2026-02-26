import { signAccessToken, type JwtPayload } from '../services/jwt.service';
import type { UserRoleValue } from '@haversack/shared';

const DEFAULT_TENANT_ID = '00000000-0000-4000-a000-000000000001';

export function generateTestToken(
  role: UserRoleValue,
  overrides?: Partial<JwtPayload>,
): string {
  const payload: JwtPayload = {
    userId: overrides?.userId ?? '00000000-0000-4000-a000-000000000010',
    email: overrides?.email ?? `${role}@haversack.test`,
    role,
    tenantId: overrides?.tenantId ?? DEFAULT_TENANT_ID,
  };

  return signAccessToken(payload);
}

export function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

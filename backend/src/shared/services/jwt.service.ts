import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '@haversack/shared';
import type { UserRoleValue } from '@haversack/shared';

const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET'] ?? 'dev-access-secret-change-in-production';
const REFRESH_SECRET =
  process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret-change-in-production';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRoleValue;
  tenantId: string;
}

export interface DecodedToken extends JwtPayload {
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: 'access' }, ACCESS_SECRET, {
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, {
    expiresIn: AUTH_CONFIG.REFRESH_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): DecodedToken {
  const decoded = jwt.verify(token, ACCESS_SECRET) as DecodedToken;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type: expected access token');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): DecodedToken {
  const decoded = jwt.verify(token, REFRESH_SECRET) as DecodedToken;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }
  return decoded;
}

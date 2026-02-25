/**
 * JWT service for access and refresh token management.
 * - 15-minute access tokens (NFR-007)
 * - 7-day refresh tokens (NFR-007)
 * Token payload: { userId, tenantId, role, email }
 */
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env['JWT_ACCESS_SECRET'] ?? 'dev-access-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

/**
 * Sign an access token with 15-minute expiry.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Sign a refresh token with 7-day expiry.
 */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Verify and decode an access token. Throws on invalid/expired tokens.
 */
export function verifyAccessToken(token: string): DecodedToken {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    algorithms: ['HS256'],
  });
  return decoded as DecodedToken;
}

/**
 * Verify and decode a refresh token. Throws on invalid/expired tokens.
 */
export function verifyRefreshToken(token: string): DecodedToken {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
    algorithms: ['HS256'],
  });
  return decoded as DecodedToken;
}

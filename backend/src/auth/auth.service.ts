/**
 * Authentication service: password hashing, login, token refresh, and logout.
 * - Bcrypt cost factor 12 for password hashing
 * - Issues access + refresh token pairs
 * - Stores hashed refresh tokens in the User record for invalidation
 */
import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from './jwt.service.js';
import { logger } from '../shared/utils/logger.js';

const BCRYPT_COST_FACTOR = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  tokens: AuthTokens;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    territoryId: string | null;
  };
}

/**
 * Hash a plaintext password with bcrypt at cost factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access + refresh token pair and store the hashed refresh token on the user.
 */
async function generateAndStoreTokens(
  prisma: PrismaClient,
  payload: TokenPayload,
): Promise<AuthTokens> {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store a hash of the refresh token for invalidation
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: payload.userId },
    data: {
      refresh_token_hash: refreshTokenHash,
      last_login_at: new Date(),
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Authenticate a user by email and password, returning tokens and user info.
 * Throws descriptive errors for invalid credentials or inactive accounts.
 */
export async function login(
  prisma: PrismaClient,
  tenantId: string | undefined,
  email: string,
  password: string,
): Promise<LoginResult> {
  const user = await prisma.user.findFirst({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      email: email.toLowerCase(),
      deleted_at: null,
    },
  });

  if (!user) {
    logger.warn({ operation: 'auth-login', email, tenantId }, 'Login failed: user not found');
    throw Object.assign(new Error('Invalid email or password'), {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  }

  if (!user.is_active) {
    logger.warn(
      { operation: 'auth-login', userId: user.id, tenantId },
      'Login failed: account deactivated',
    );
    throw Object.assign(new Error('Account has been deactivated'), {
      statusCode: 403,
      code: 'ACCOUNT_DEACTIVATED',
    });
  }

  const passwordValid = await comparePassword(password, user.password_hash);
  if (!passwordValid) {
    logger.warn({ operation: 'auth-login', email, tenantId }, 'Login failed: invalid password');
    throw Object.assign(new Error('Invalid email or password'), {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  }

  const payload: TokenPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    email: user.email,
  };

  const tokens = await generateAndStoreTokens(prisma, payload);

  logger.info(
    { operation: 'auth-login', userId: user.id, tenantId },
    'User logged in successfully',
  );

  return {
    tokens,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      tenantId: user.tenant_id,
      territoryId: user.territory_id,
    },
  };
}

/**
 * Validate a refresh token and issue a new access + refresh pair.
 * Also invalidates the old refresh token (rotation).
 */
export async function refreshTokens(
  prisma: PrismaClient,
  refreshToken: string,
): Promise<AuthTokens> {
  let decoded: TokenPayload;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), {
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: decoded.userId,
      tenant_id: decoded.tenantId,
      deleted_at: null,
      is_active: true,
    },
  });

  if (!user || !user.refresh_token_hash) {
    throw Object.assign(new Error('Invalid or expired refresh token'), {
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  }

  // Verify the refresh token matches the stored hash
  const tokenValid = await bcrypt.compare(refreshToken, user.refresh_token_hash);
  if (!tokenValid) {
    // Potential token reuse — invalidate all sessions for this user
    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token_hash: null },
    });

    logger.warn(
      { operation: 'auth-refresh', userId: user.id },
      'Refresh token reuse detected — all sessions invalidated',
    );

    throw Object.assign(new Error('Invalid or expired refresh token'), {
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  }

  const payload: TokenPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    email: user.email,
  };

  const tokens = await generateAndStoreTokens(prisma, payload);

  logger.info(
    { operation: 'auth-refresh', userId: user.id },
    'Tokens refreshed successfully',
  );

  return tokens;
}

/**
 * Invalidate a user's refresh token (logout).
 */
export async function logout(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refresh_token_hash: null },
  });

  logger.info({ operation: 'auth-logout', userId }, 'User logged out');
}

import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { comparePassword } from '../shared/services/password.service';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from '../shared/services/jwt.service';
import type { UserRoleValue } from '@haversack/shared';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRoleValue;
    firstName: string;
    lastName: string;
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function login(
  prisma: PrismaClient,
  email: string,
  password: string,
): Promise<LoginResult> {
  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
  });

  if (!user) {
    throw new AuthError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AuthError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new AuthError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRoleValue,
    tenantId: user.tenantId,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token hash
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role as UserRoleValue,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}

export async function refresh(
  prisma: PrismaClient,
  refreshTokenValue: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const decoded = verifyRefreshToken(refreshTokenValue);

  const tokenHash = hashToken(refreshTokenValue);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!storedToken || storedToken.revokedAt) {
    throw new AuthError('Refresh token expired', 'AUTH_TOKEN_EXPIRED');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AuthError('Refresh token expired', 'AUTH_TOKEN_EXPIRED');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // Get current user data for new token
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || !user.isActive) {
    throw new AuthError('Refresh token expired', 'AUTH_TOKEN_EXPIRED');
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRoleValue,
    tenantId: user.tenantId,
  };

  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  // Store new refresh token
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

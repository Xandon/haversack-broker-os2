import { describe, expect, it } from 'vitest';

import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './auth.js';
import type { JwtPayload } from './auth.js';

describe('Auth Plugin', () => {
  const mockPayload: JwtPayload = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '660e8400-e29b-41d4-a716-446655440000',
    role: 'rep',
    email: 'test@example.com',
  };

  it('FR-INFRA: signs and verifies access tokens', () => {
    const token = signAccessToken(mockPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(mockPayload.userId);
    expect(decoded.tenantId).toBe(mockPayload.tenantId);
    expect(decoded.role).toBe(mockPayload.role);
    expect(decoded.email).toBe(mockPayload.email);
  });

  it('FR-INFRA: signs and verifies refresh tokens', () => {
    const token = signRefreshToken({
      userId: mockPayload.userId,
      tenantId: mockPayload.tenantId,
    });
    expect(token).toBeDefined();

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(mockPayload.userId);
    expect(decoded.tenantId).toBe(mockPayload.tenantId);
  });

  it('FR-INFRA: rejects invalid access tokens', () => {
    expect(() => verifyAccessToken('invalid-token')).toThrow();
  });

  it('FR-INFRA: rejects invalid refresh tokens', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow();
  });
});

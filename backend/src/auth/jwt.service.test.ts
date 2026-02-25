/**
 * JWT Service unit tests.
 * T036: Auth tests — JWT signing and verification.
 */
import { describe, expect, test } from 'vitest';

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type TokenPayload,
} from './jwt.service.js';

const TEST_PAYLOAD: TokenPayload = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  tenantId: '660e8400-e29b-41d4-a716-446655440000',
  role: 'rep',
  email: 'test@haversack.com',
};

describe('JWT Service', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    test('FR-001: signs and verifies a valid access token', () => {
      const token = signAccessToken(TEST_PAYLOAD);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
      expect(decoded.tenantId).toBe(TEST_PAYLOAD.tenantId);
      expect(decoded.role).toBe(TEST_PAYLOAD.role);
      expect(decoded.email).toBe(TEST_PAYLOAD.email);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('FR-001: access token includes iat and exp claims', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      const decoded = verifyAccessToken(token);

      // exp should be ~15 minutes after iat
      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBe(15 * 60);
    });

    test('FR-001: rejects tampered access token', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      const tampered = `${token}x`;

      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    test('FR-001: rejects empty string token', () => {
      expect(() => verifyAccessToken('')).toThrow();
    });

    test('FR-001: rejects garbage string', () => {
      expect(() => verifyAccessToken('not.a.jwt')).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    test('FR-001: signs and verifies a valid refresh token', () => {
      const token = signRefreshToken(TEST_PAYLOAD);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
      expect(decoded.tenantId).toBe(TEST_PAYLOAD.tenantId);
      expect(decoded.role).toBe(TEST_PAYLOAD.role);
      expect(decoded.email).toBe(TEST_PAYLOAD.email);
    });

    test('FR-001: refresh token expires in 7 days', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      const decoded = verifyRefreshToken(token);

      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBe(7 * 24 * 60 * 60);
    });

    test('FR-001: rejects tampered refresh token', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      const tampered = `${token}x`;

      expect(() => verifyRefreshToken(tampered)).toThrow();
    });
  });

  describe('cross-token type rejection', () => {
    test('FR-001: access token cannot be verified as refresh token', () => {
      const accessToken = signAccessToken(TEST_PAYLOAD);

      // Access and refresh use different secrets, so cross-verification should fail
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    test('FR-001: refresh token cannot be verified as access token', () => {
      const refreshToken = signRefreshToken(TEST_PAYLOAD);

      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });
});

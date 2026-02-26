import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.service';

const TEST_PAYLOAD = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  email: 'rep@haversack.test',
  role: 'rep' as const,
  tenantId: '00000000-0000-0000-0000-000000000001',
};

describe('FR-F001: JWT service', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    it('US2-AC1: signs and verifies a valid access token', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
      expect(decoded.email).toBe(TEST_PAYLOAD.email);
      expect(decoded.role).toBe(TEST_PAYLOAD.role);
      expect(decoded.tenantId).toBe(TEST_PAYLOAD.tenantId);
    });

    it('FR-F001: access token has exp claim', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      const decoded = verifyAccessToken(token);
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
    });

    it('FR-F001: throws on invalid access token', () => {
      expect(() => verifyAccessToken('invalid.token.string')).toThrow();
    });

    it('FR-F001: throws on tampered access token', () => {
      const token = signAccessToken(TEST_PAYLOAD);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('US2-AC3: signs and verifies a valid refresh token', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      expect(typeof token).toBe('string');

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
    });

    it('FR-F001: refresh token has exp claim', () => {
      const token = signRefreshToken(TEST_PAYLOAD);
      const decoded = verifyRefreshToken(token);
      expect(decoded.exp).toBeDefined();
    });

    it('FR-F001: access token cannot be verified as refresh token', () => {
      const accessToken = signAccessToken(TEST_PAYLOAD);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});

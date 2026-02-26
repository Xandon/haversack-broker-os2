import { describe, it, expect } from 'vitest';
import {
  loginRequestSchema,
  refreshRequestSchema,
  tokenResponseSchema,
} from './auth.schema';

describe('FR-F001: Auth Zod schemas', () => {
  describe('loginRequestSchema', () => {
    it('FR-F001: accepts valid login credentials', () => {
      const result = loginRequestSchema.safeParse({
        email: 'rep@haversack.test',
        password: 'TestPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('FR-F001: rejects invalid email', () => {
      const result = loginRequestSchema.safeParse({
        email: 'not-an-email',
        password: 'TestPassword123!',
      });
      expect(result.success).toBe(false);
    });

    it('FR-F001: rejects empty password', () => {
      const result = loginRequestSchema.safeParse({
        email: 'rep@haversack.test',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('FR-F001: rejects missing fields', () => {
      const result = loginRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('refreshRequestSchema', () => {
    it('FR-F001: accepts valid refresh token', () => {
      const result = refreshRequestSchema.safeParse({
        refreshToken: 'some-valid-token-string',
      });
      expect(result.success).toBe(true);
    });

    it('FR-F001: rejects missing refresh token', () => {
      const result = refreshRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('tokenResponseSchema', () => {
    it('US2-AC1: validates token response shape', () => {
      const result = tokenResponseSchema.safeParse({
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'rep@haversack.test',
          role: 'rep',
          firstName: 'Test',
          lastName: 'Rep',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

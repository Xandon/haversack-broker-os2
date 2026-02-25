/**
 * Auth schema (Zod) validation tests.
 * T036: Auth tests — input validation for auth endpoints.
 */
import { describe, expect, test } from 'vitest';

import { loginSchema, refreshSchema, registerSchema } from './auth.schema.js';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    test('FR-001: accepts valid login input', () => {
      const result = loginSchema.safeParse({
        email: 'admin@haversack.com',
        password: 'password123',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('admin@haversack.com');
      }
    });

    test('FR-001: lowercases email address', () => {
      const result = loginSchema.safeParse({
        email: 'Admin@Haversack.COM',
        password: 'password123',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('admin@haversack.com');
      }
    });

    test('FR-001: rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(false);
    });

    test('FR-001: rejects short password', () => {
      const result = loginSchema.safeParse({
        email: 'admin@haversack.com',
        password: 'short',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(false);
    });

    test('FR-001: rejects invalid tenantId', () => {
      const result = loginSchema.safeParse({
        email: 'admin@haversack.com',
        password: 'password123',
        tenantId: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });

    test('FR-001: rejects missing fields', () => {
      expect(loginSchema.safeParse({}).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    test('FR-001: accepts valid refresh token', () => {
      const result = refreshSchema.safeParse({
        refreshToken: 'some-valid-jwt-string',
      });

      expect(result.success).toBe(true);
    });

    test('FR-001: rejects empty refresh token', () => {
      const result = refreshSchema.safeParse({
        refreshToken: '',
      });

      expect(result.success).toBe(false);
    });

    test('FR-001: rejects missing refresh token', () => {
      const result = refreshSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    test('FR-001: accepts valid registration input', () => {
      const result = registerSchema.safeParse({
        email: 'new@haversack.com',
        password: 'SecurePass1',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
    });

    test('FR-001: accepts optional territoryId', () => {
      const result = registerSchema.safeParse({
        email: 'new@haversack.com',
        password: 'SecurePass1',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        territoryId: '770e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
    });

    test('FR-001: rejects password without uppercase', () => {
      const result = registerSchema.safeParse({
        email: 'new@haversack.com',
        password: 'alllowercase1',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(false);
    });

    test('FR-001: rejects password without digit', () => {
      const result = registerSchema.safeParse({
        email: 'new@haversack.com',
        password: 'NoDigitsHere',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(false);
    });

    test('FR-001: rejects invalid role', () => {
      const result = registerSchema.safeParse({
        email: 'new@haversack.com',
        password: 'SecurePass1',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'superadmin',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(false);
    });

    test('FR-001: validates all 5 valid roles', () => {
      const roles = ['admin', 'manager', 'rep', 'logistics', 'viewer'];

      for (const role of roles) {
        const result = registerSchema.safeParse({
          email: 'new@haversack.com',
          password: 'SecurePass1',
          firstName: 'Jane',
          lastName: 'Doe',
          role,
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
        });

        expect(result.success).toBe(true);
      }
    });
  });
});

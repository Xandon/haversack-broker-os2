import { describe, it, expect } from 'vitest';
import {
  AUTH_CONFIG,
  DEFAULT_TENANT_ID,
  ERROR_CODES,
} from './index';

describe('FR-F001/FR-F002: Shared constants', () => {
  it('FR-F001: AUTH_CONFIG has 15-minute access token TTL', () => {
    expect(AUTH_CONFIG.ACCESS_TOKEN_TTL).toBe('15m');
  });

  it('FR-F001: AUTH_CONFIG has 7-day refresh token TTL', () => {
    expect(AUTH_CONFIG.REFRESH_TOKEN_TTL).toBe('7d');
  });

  it('FR-F002: AUTH_CONFIG has bcrypt cost factor 12', () => {
    expect(AUTH_CONFIG.BCRYPT_COST).toBe(12);
  });

  it('FR-F001: AUTH_CONFIG has rate limit of 10 requests per minute', () => {
    expect(AUTH_CONFIG.RATE_LIMIT_MAX).toBe(10);
    expect(AUTH_CONFIG.RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });

  it('provides a default tenant ID as UUID', () => {
    expect(DEFAULT_TENANT_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('FR-F010: ERROR_CODES has standard error codes', () => {
    expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
    expect(ERROR_CODES.AUTH_MISSING_TOKEN).toBe('AUTH_MISSING_TOKEN');
    expect(ERROR_CODES.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED');
    expect(ERROR_CODES.AUTH_FORBIDDEN).toBe('AUTH_FORBIDDEN');
    expect(ERROR_CODES.AUTH_RATE_LIMITED).toBe('AUTH_RATE_LIMITED');
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ERROR_CODES.ROUTE_NOT_FOUND).toBe('ROUTE_NOT_FOUND');
  });
});

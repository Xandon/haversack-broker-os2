import { describe, it, expect } from 'vitest';
import { errorResponseSchema, validationErrorSchema } from './error.schema';

describe('FR-F010: Error response Zod schemas', () => {
  it('FR-F010: validates standard error response shape', () => {
    const result = errorResponseSchema.safeParse({
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
      code: 'AUTH_INVALID_CREDENTIALS',
      requestId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('FR-F010: rejects error response missing requestId', () => {
    const result = errorResponseSchema.safeParse({
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(result.success).toBe(false);
  });

  it('US6-AC5: validates validation error with field details', () => {
    const result = validationErrorSchema.safeParse({
      error: 'BAD_REQUEST',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      details: [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from './password.service';

describe('FR-F002: Password service', () => {
  it('US2-AC7: hashes a password and produces a bcrypt hash', async () => {
    const hash = await hashPassword('TestPassword123!');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('FR-F002: uses bcrypt cost factor 12', async () => {
    const hash = await hashPassword('TestPassword123!');
    // bcrypt hash format: $2b$12$...
    const costFactor = hash.split('$')[2];
    expect(costFactor).toBe('12');
  });

  it('FR-F002: comparing correct password returns true', async () => {
    const hash = await hashPassword('TestPassword123!');
    const isMatch = await comparePassword('TestPassword123!', hash);
    expect(isMatch).toBe(true);
  });

  it('FR-F002: comparing wrong password returns false', async () => {
    const hash = await hashPassword('TestPassword123!');
    const isMatch = await comparePassword('WrongPassword123!', hash);
    expect(isMatch).toBe(false);
  });

  it('FR-F002: different passwords produce different hashes', async () => {
    const hash1 = await hashPassword('Password1!');
    const hash2 = await hashPassword('Password2!');
    expect(hash1).not.toBe(hash2);
  });

  it('FR-F002: same password produces different hashes (salted)', async () => {
    const hash1 = await hashPassword('TestPassword123!');
    const hash2 = await hashPassword('TestPassword123!');
    expect(hash1).not.toBe(hash2);
  });
});

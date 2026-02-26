import bcrypt from 'bcrypt';
import { AUTH_CONFIG } from '@haversack/shared';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONFIG.BCRYPT_COST);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

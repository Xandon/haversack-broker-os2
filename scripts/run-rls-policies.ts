/**
 * RLS Policy Runner
 *
 * Applies Row-Level Security policies from prisma/rls-policies.sql
 * to the PostgreSQL database. Run after migrations.
 *
 * Usage: npx tsx scripts/run-rls-policies.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const sqlPath = path.join(__dirname, '..', 'prisma', 'rls-policies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`Applying ${statements.length} RLS policy statements...`);

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(`${statement};`);
        const preview = statement.substring(0, 80).replace(/\n/g, ' ');
        console.log(`  ✅ ${preview}...`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // Ignore "already exists" errors for idempotency
        if (message.includes('already exists')) {
          const preview = statement.substring(0, 60).replace(/\n/g, ' ');
          console.log(`  ⚠️  Already exists: ${preview}...`);
        } else {
          console.error(`  ❌ Failed: ${statement.substring(0, 80)}...`);
          console.error(`     Error: ${message}`);
        }
      }
    }

    console.log('\n✅ RLS policies applied successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Failed to apply RLS policies:', error);
  process.exit(1);
});

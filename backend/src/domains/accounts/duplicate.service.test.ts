import { describe, test, expect, vi, beforeEach } from 'vitest';
import { checkDuplicates } from './duplicate.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

function createMockPrisma(): Record<string, unknown> {
  return {
    $queryRawUnsafe: vi.fn(),
  };
}

describe('FR-005: Duplicate detection service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
  });

  test('FR-005: detects exact name match (distance 0)', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'acc-1', name: 'Pacific Bistro', distance: 0 },
    ]);

    const result = await checkDuplicates(prisma as never, TENANT_ID, 'Pacific Bistro');

    expect(result.hasDuplicates).toBe(true);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0]?.confidence).toBe(100);
    expect(result.duplicates[0]?.matchField).toBe('name');
  });

  test('FR-005: detects near-match within Levenshtein distance 3', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'acc-1', name: 'Pacific Bistros', distance: 1 },
    ]);

    const result = await checkDuplicates(prisma as never, TENANT_ID, 'Pacific Bistro');

    expect(result.hasDuplicates).toBe(true);
    expect(result.duplicates[0]?.confidence).toBe(90);
  });

  test('FR-005: returns no duplicates when distance > 3', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await checkDuplicates(prisma as never, TENANT_ID, 'Unique Name');

    expect(result.hasDuplicates).toBe(false);
    expect(result.duplicates).toHaveLength(0);
  });

  test('FR-005: detects phone number match', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // No name matches
      .mockResolvedValueOnce([{ id: 'acc-2', account_name: 'Phone Match Co' }]); // Phone match

    const result = await checkDuplicates(
      prisma as never,
      TENANT_ID,
      'New Company',
      '503-555-1234',
    );

    expect(result.hasDuplicates).toBe(true);
    expect(result.duplicates[0]?.matchField).toBe('phone');
    expect(result.duplicates[0]?.confidence).toBe(70);
  });

  test('FR-005: detects address match', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // No name matches
      .mockResolvedValueOnce([{ id: 'acc-3', name: 'Address Match Co' }]); // Address match

    const result = await checkDuplicates(
      prisma as never,
      TENANT_ID,
      'New Company',
      undefined,
      '123 Main St',
    );

    expect(result.hasDuplicates).toBe(true);
    expect(result.duplicates[0]?.matchField).toBe('address');
    expect(result.duplicates[0]?.confidence).toBe(65);
  });

  test('FR-005: deduplicates matches across fields', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 'acc-1', name: 'Pacific Bistro', distance: 0 }]) // Name match
      .mockResolvedValueOnce([{ id: 'acc-1', account_name: 'Pacific Bistro' }]); // Same account via phone

    const result = await checkDuplicates(
      prisma as never,
      TENANT_ID,
      'Pacific Bistro',
      '503-555-1234',
    );

    // Should only appear once (from name match)
    expect(result.duplicates.filter((d) => d.id === 'acc-1')).toHaveLength(1);
  });

  test('FR-005: sorts results by confidence descending', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { id: 'acc-1', name: 'Pacific Bistros', distance: 1 },
        { id: 'acc-2', name: 'Pacific Bistro', distance: 0 },
      ]);

    const result = await checkDuplicates(prisma as never, TENANT_ID, 'Pacific Bistro');

    expect(result.duplicates[0]?.confidence).toBeGreaterThan(
      result.duplicates[1]?.confidence ?? 0,
    );
  });

  test('FR-005: includes tenant_id in queries', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await checkDuplicates(prisma as never, TENANT_ID, 'Test');

    const call = (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call?.[0]).toContain('tenant_id');
    expect(call).toContain(TENANT_ID);
  });

  test('FR-005: confidence decreases with Levenshtein distance', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'acc-1', name: 'Match', distance: 2 },
    ]);

    const result = await checkDuplicates(prisma as never, TENANT_ID, 'Mach');

    expect(result.duplicates[0]?.confidence).toBe(75);
  });
});

// Runs against a real, migrated SQLite database (see tests/global-setup.ts).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../../tests/helpers/test-db';
import { GENESIS_HASH, hashAuditEntry } from '@/domain/audit';
import {
  auditChainHead,
  listAuditLog,
  verifyAuditChain,
  withAudit,
  type AuditEntry,
} from './audit';
import type { PrismaClient } from './prisma-client';

let db: PrismaClient;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
});
afterAll(async () => {
  await cleanup();
});
beforeEach(async () => {
  await db.auditLog.deleteMany();
  await db.asset.deleteMany();
  await db.asset.create({
    data: {
      id: 'ebike-001',
      category: 'e_bike',
      make: 'Kettu Bikes',
      model: 'Urban 1',
      model_year: 2026,
      serial_number: 'LL-EB-240000',
      condition: 'new',
      usage_unit: 'km',
      usage_value: 0,
      previous_lives: 0,
      status: 'available',
    },
  });
});

const entry: AuditEntry = {
  actor: 'team-test',
  action: 'asset.status_changed',
  entityType: 'asset',
  entityId: 'ebike-001',
  details: { from: 'available', to: 'reserved' },
};

const reserve = (tx: Parameters<Parameters<typeof withAudit>[2]>[0]) =>
  tx.asset.update({ where: { id: 'ebike-001' }, data: { status: 'reserved' } });

async function currentStatus() {
  return (await db.asset.findUniqueOrThrow({ where: { id: 'ebike-001' } })).status;
}

describe('withAudit', () => {
  it('commits the change and the audit row together', async () => {
    const updated = await withAudit(db, entry, reserve);

    expect(updated.status).toBe('reserved');
    expect(await currentStatus()).toBe('reserved');
    const rows = await db.auditLog.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor: 'team-test',
      action: 'asset.status_changed',
      entity_type: 'asset',
      entity_id: 'ebike-001',
      details_json: '{"from":"available","to":"reserved"}',
    });
  });

  it('stores no details as null', async () => {
    await withAudit(db, { ...entry, details: undefined }, reserve);
    expect((await db.auditLog.findFirstOrThrow()).details_json).toBeNull();
  });

  it('rolls back the change when the audit write fails', async () => {
    // A missing actor makes the AuditLog insert fail inside the transaction.
    const broken = { ...entry, actor: undefined as unknown as string };

    await expect(withAudit(db, broken, reserve)).rejects.toThrow();

    expect(await currentStatus()).toBe('available');
    expect(await db.auditLog.count()).toBe(0);
  });

  it('writes no audit row when the change itself fails', async () => {
    await expect(
      withAudit(db, entry, async (tx) => {
        await reserve(tx);
        throw new Error('business rule broken after the write');
      })
    ).rejects.toThrow('business rule broken');

    expect(await currentStatus()).toBe('available');
    expect(await db.auditLog.count()).toBe(0);
  });
});

describe('listAuditLog', () => {
  it('returns the newest rows first with details parsed from JSON', async () => {
    await withAudit(db, entry, reserve);
    await withAudit(db, { ...entry, details: { from: 'reserved', to: 'returned' } }, (tx) =>
      tx.asset.update({ where: { id: 'ebike-001' }, data: { status: 'returned' } })
    );

    const log = await listAuditLog(db);

    expect(log.map((row) => row.details)).toEqual([
      { from: 'reserved', to: 'returned' },
      { from: 'available', to: 'reserved' },
    ]);
    expect(Date.parse(log[0]?.created_at ?? '')).not.toBeNaN();
  });

  it('respects the limit', async () => {
    await withAudit(db, entry, reserve);
    await withAudit(db, entry, reserve);
    expect(await listAuditLog(db, 1)).toHaveLength(1);
  });
});

describe('the audit chain', () => {
  const at = (minute: number) => `2026-11-05T10:${String(minute).padStart(2, '0')}:00.000Z`;

  async function rowsInOrder() {
    return db.auditLog.findMany({ orderBy: { id: 'asc' } });
  }

  it('chains the second row to the first and the first to the genesis hash', async () => {
    await withAudit(db, entry, reserve, at(0));
    await withAudit(db, entry, reserve, at(1));

    const [first, second] = await rowsInOrder();
    expect(first?.prev_hash).toBe(GENESIS_HASH);
    expect(first?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(second?.prev_hash).toBe(first?.hash);
    expect(second?.hash).not.toBe(first?.hash);
  });

  it('sets created_at from the instant it is given and hashes it', async () => {
    await withAudit(db, entry, reserve, '2026-11-05T10:00:00Z');
    const row = await db.auditLog.findFirstOrThrow();
    expect(row.created_at.toISOString()).toBe('2026-11-05T10:00:00.000Z');
    expect(row.hash).toBe(
      hashAuditEntry(GENESIS_HASH, {
        actor: entry.actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details,
        createdAt: '2026-11-05T10:00:00.000Z',
      })
    );
  });

  it('chains the next row to the last good one after a failed change', async () => {
    await withAudit(db, entry, reserve, at(0));
    await expect(
      withAudit(
        db,
        entry,
        async () => {
          throw new Error('refused');
        },
        at(1)
      )
    ).rejects.toThrow('refused');
    await withAudit(db, entry, reserve, at(2));

    const rows = await rowsInOrder();
    expect(rows).toHaveLength(2);
    expect(rows[1]?.prev_hash).toBe(rows[0]?.hash);
    expect((await verifyAuditChain(db)).ok).toBe(true);
  });

  it('verifies after ten writes and reports the head', async () => {
    for (let minute = 0; minute < 10; minute++) {
      await withAudit(db, { ...entry, details: { minute } }, reserve, at(minute));
    }
    const head = await auditChainHead(db);
    expect(await verifyAuditChain(db)).toEqual({
      ok: true,
      length: 10,
      legacyRows: 0,
      headHash: head,
    });
    expect(head).toBe((await rowsInOrder())[9]?.hash);
  });

  it('reports the row whose details were edited behind the app', async () => {
    for (let minute = 0; minute < 3; minute++) {
      await withAudit(db, { ...entry, details: { minute } }, reserve, at(minute));
    }
    const target = (await rowsInOrder())[1]!;
    // The test may do this; the app never does (tests/meta-rules.test.ts).
    await db.$executeRaw`UPDATE "AuditLog" SET details_json = '{"minute":7}' WHERE id = ${target.id}`;

    expect(await verifyAuditChain(db)).toEqual({
      ok: false,
      brokenAt: target.id,
      reason: 'hash_mismatch',
    });
  });

  it('reports a re-timed row', async () => {
    await withAudit(db, entry, reserve, at(0));
    const row = await db.auditLog.findFirstOrThrow();
    await db.$executeRaw`UPDATE "AuditLog" SET created_at = ${new Date(at(5))} WHERE id = ${row.id}`;
    expect(await verifyAuditChain(db)).toMatchObject({ ok: false, brokenAt: row.id });
  });

  it('treats rows from before the chain as a legacy prefix', async () => {
    await db.auditLog.create({
      data: { actor: 'old', action: 'asset.created', entity_type: 'asset', entity_id: 'x' },
    });
    await withAudit(db, entry, reserve, at(0));

    const rows = await rowsInOrder();
    expect(rows[1]?.prev_hash).toBe(GENESIS_HASH);
    expect(await verifyAuditChain(db)).toMatchObject({ ok: true, length: 2, legacyRows: 1 });
  });

  it('gives the genesis head for an empty log', async () => {
    expect(await auditChainHead(db)).toBe(GENESIS_HASH);
    expect(await verifyAuditChain(db)).toEqual({
      ok: true,
      length: 0,
      legacyRows: 0,
      headHash: GENESIS_HASH,
    });
  });
});

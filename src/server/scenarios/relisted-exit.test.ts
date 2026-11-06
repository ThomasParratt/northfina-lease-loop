// The exit of a relisted item (review findings 1 and 3) on a real migrated database: the
// return's market value starts from D60's first-lease list price, the same as the assessment,
// never from the second-life contract price, which is already a depreciated value.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { payRents, signedContract } from '../../../tests/helpers/journey';
import { seedPack } from '../../../tests/helpers/invoice-fixture';
import { resetDb } from '../../../tests/helpers/reset-db';
import { createTestDb } from '../../../tests/helpers/test-db';
import { withProductionHandlers } from '../../../tests/helpers/with-handlers';
import { exitContract, previewExit } from '../exits';
import type { PrismaClient } from '../prisma-client';
import { assessAsset } from '../second-life';

let db: PrismaClient;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
});
afterAll(async () => {
  await cleanup();
});
beforeEach(async () => {
  await resetDb(db);
  await seedPack(db);
});
withProductionHandlers();

const marketValueOf = (lines: readonly { code: string; params: Record<string, unknown> }[]) =>
  lines.find((l) => l.code === 'market_value')?.params;

async function relistAndLease(assetId: string, termMonths: number) {
  const assessed = await assessAsset(db, { assetId, actor: 'admin', today: '2026-11-06' });
  if (!assessed.ok) throw new Error(assessed.reason.code);
  const trip = { customerId: 'cust-aino', assetId, termMonths, quoteOn: '2026-11-06' };
  return signedContract(db, trip);
}

describe('an early return of a relisted item (finding 1)', () => {
  it('card 9: ebike-007 returned good with 0 km on 2027-11-06 is worth 121 329 (549 000, 58 months)', async () => {
    const { contract } = await relistAndLease('ebike-007', 24);
    expect(contract.unitListPriceCents).toBe(155_476);
    const preview = await previewExit(
      db,
      {
        contractId: contract.id,
        mode: 'return',
        reported: { condition: 'good', usage: { unit: 'km', value: 0 } },
      },
      '2027-11-06'
    );
    if (!preview.ok) throw new Error(preview.reason.code);
    // The review's 448,99 € came from 155 476/203 161 aged again; D60 gives 1 213,29 €.
    expect(marketValueOf(preview.preview.return.lines)).toMatchObject({
      amountCents: 121_329,
      ageMonths: 58,
    });
  });

  it("card 10: ebike-008's exit preview starts from 179 900 (v1) at 70 months, not 37 101", async () => {
    const { contract } = await relistAndLease('ebike-008', 24);
    expect(contract.unitListPriceCents).toBe(37_101);
    const preview = await previewExit(
      db,
      {
        contractId: contract.id,
        mode: 'return',
        reported: { condition: 'good', usage: { unit: 'km', value: 9_800 } },
      },
      '2027-11-06'
    );
    if (!preview.ok) throw new Error(preview.reason.code);
    const value = marketValueOf(preview.preview.return.lines);
    expect(value?.ageMonths).toBe(70);
    // 179 900 × 25 % × 0.85 (good) × 82 % (9 steps of 1 000 km) = 31 348; aged again from the
    // second-life price 37 101 it was 6 465.
    expect(value?.amountCents).toBe(31_348);
  });
});

describe('a second lease of an item that was ours from new (finding 3)', () => {
  it('card 1 returned, relisted and leased again: the exit ages it from the first lease, 2026-11-05', async () => {
    const aino = 'cust-aino';
    const card1 = { customerId: aino, assetId: 'ebike-003', termMonths: 12, quoteOn: '2026-11-05' };
    const { contract } = await signedContract(db, card1);
    await payRents(db, contract.id, 12, aino);
    const back = await exitContract(
      db,
      {
        contractId: contract.id,
        mode: 'return',
        reported: { condition: 'good', usage: { unit: 'km', value: 3_000 } },
        actor: aino,
      },
      contract.endDate
    );
    if (!back.ok) throw new Error(back.reason.code);
    const assessed = await assessAsset(db, {
      assetId: 'ebike-003',
      actor: 'admin',
      today: contract.endDate,
    });
    if (!assessed.ok) throw new Error(assessed.reason.code);
    const lena = 'cust-lena';
    const trip = {
      customerId: lena,
      assetId: 'ebike-003',
      termMonths: 12,
      quoteOn: contract.endDate,
    };
    const second = await signedContract(db, trip);
    const preview = await previewExit(
      db,
      {
        contractId: second.contract.id,
        mode: 'return',
        reported: { condition: 'good', usage: { unit: 'km', value: 3_000 } },
      },
      '2028-05-05'
    );
    if (!preview.ok) throw new Error(preview.reason.code);
    // 18 whole months since 2026-11-05 (not 6 since the second lease started), and the curve's
    // price is card 1's list price, not the second-life amount.
    expect(marketValueOf(preview.preview.return.lines)?.ageMonths).toBe(18);
    expect(second.contract.unitListPriceCents).not.toBe(contract.unitListPriceCents);
  });
});

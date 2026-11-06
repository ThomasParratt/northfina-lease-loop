// POST /api/demo/clock sets the demo clock cookie to a day and clears it with null, through
// demoClockCookieHeader (the one writer of that cookie), and refuses a day that does not exist.
// Against a real, migrated SQLite database seeded with the pack: once records exist, the clock
// never goes before the latest recorded day (D90), back to the real day included, and a card
// run still writes on its own scripted day.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { seedPack } from '../../../../../tests/helpers/invoice-fixture';
import { createTestDb } from '../../../../../tests/helpers/test-db';
import { withProductionHandlers } from '../../../../../tests/helpers/with-handlers';
import { DEMO_CLOCK_COOKIE } from '@/server/demo-clock';
import { runDemoCard } from '@/server/demo-cards';
import type { PrismaClient } from '@/server/prisma-client';

const holder = vi.hoisted(() => ({
  db: undefined as unknown as PrismaClient,
  today: '2026-11-06',
}));
vi.mock('@/server/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/server/today', () => ({ todayIso: () => holder.today }));

const { POST } = await import('./route');

let cleanup: () => Promise<void>;
beforeAll(async () => {
  ({ db: holder.db, cleanup } = await createTestDb());
  await seedPack(holder.db);
});
afterAll(async () => {
  await cleanup();
});
withProductionHandlers();

async function post(body: unknown) {
  const request = new Request('http://localhost/api/demo/clock', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await POST(request, { params: Promise.resolve({}) });
  return {
    status: response.status,
    cookies: response.headers.getSetCookie(),
    body: await response.json(),
  };
}

// The tests run in order on one database: first with no records, then after card 1 has run.
describe('POST /api/demo/clock', () => {
  it('travels to a day: the cookie holds it for the whole site, the body says so', async () => {
    const { status, cookies, body } = await post({ asOf: '2028-02-29' });
    expect(status).toBe(200);
    expect(body.data).toEqual({ asOf: '2028-02-29', today: '2028-02-29' });
    expect(cookies).toEqual([`${DEMO_CLOCK_COOKIE}=2028-02-29; Path=/; HttpOnly; SameSite=Lax`]);
  });

  it('goes back to the real day with null: the cookie expires', async () => {
    const { status, cookies, body } = await post({ asOf: null });
    expect(status).toBe(200);
    expect(body.data).toEqual({ asOf: null, today: '2026-11-06' });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(new RegExp(`^${DEMO_CLOCK_COOKIE}=; .*Max-Age=0`));
  });

  it('refuses a day that does not exist with 400 and sets nothing', async () => {
    const { status, cookies } = await post({ asOf: '2026-02-29' });
    expect(status).toBe(400);
    expect(cookies).toEqual([]);
  });

  it('travels to the earliest card day while nothing is recorded', async () => {
    const { status } = await post({ asOf: '2026-01-31' });
    expect(status).toBe(200);
  });
});

describe('POST /api/demo/clock after records exist (D90)', () => {
  beforeAll(async () => {
    const run = await runDemoCard(holder.db, 1); // signs card 1 on 2026-11-05
    expect(run.ok).toBe(true);
  });

  it('refuses the day before the latest recorded day with 409 and sets nothing', async () => {
    const { status, cookies, body } = await post({ asOf: '2026-11-04' });
    expect(status).toBe(409);
    expect(cookies).toEqual([]);
    expect(body.error.code).toBe('CLOCK_BEFORE_RECORDS');
    expect(body.error.details).toEqual({
      code: 'clock_before_records',
      params: { latestDay: '2026-11-05' },
    });
  });

  it('allows the latest recorded day itself and any later day', async () => {
    expect((await post({ asOf: '2026-11-05' })).status).toBe(200);
    expect((await post({ asOf: '2027-01-05' })).status).toBe(200);
  });

  it('refuses going back to a real day that lies before the records', async () => {
    holder.today = '2026-11-01';
    const { status, cookies, body } = await post({ asOf: null });
    holder.today = '2026-11-06';
    expect(status).toBe(409);
    expect(cookies).toEqual([]);
    expect(body.error.details.params).toEqual({ latestDay: '2026-11-05' });
  });

  it('does not block a demo card: card 4 still signs on its scripted 31 January 2026', async () => {
    const run = await runDemoCard(holder.db, 4);
    expect(run.ok).toBe(true);
    if (run.ok) expect(run.run.today).toBe('2026-02-01');
  });
});

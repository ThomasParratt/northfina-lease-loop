// The demo clock's floor (D90): reads the business days already recorded, each through its
// owner's read function (team rule 3), and asks the pure rule whether the clock may move to the
// requested day. Only POST /api/demo/clock calls it; the scenario card runner sets the clock on
// the card's own scripted days and is exempt. The audit log's `created_at` is not a business
// day (it is the real timestamp), so it is never read here.
import { checkClockFloor, type ClockFloorResult } from '@/domain/demo-clock/floor';
import { latestApplicationDay } from './applications';
import { latestAssetEventDay } from './asset-events';
import { latestContractDays } from './contracts';
import { latestPaymentDay } from './invoices';
import type { PrismaClient } from './prisma-client';
import { latestQuoteDay } from './quotes';
import { latestAssessmentDay } from './second-life';
import { latestSignatureRequestDays } from './signatories';

/** Every recorded business day's latest value, one or more per owner; nulls are empty tables. */
export async function recordedBusinessDays(db: PrismaClient): Promise<(string | null)[]> {
  const [quote, application, contract, payment, event, assessment, signature] = await Promise.all([
    latestQuoteDay(db),
    latestApplicationDay(db),
    latestContractDays(db),
    latestPaymentDay(db),
    latestAssetEventDay(db),
    latestAssessmentDay(db),
    latestSignatureRequestDays(db),
  ]);
  return [quote, application, ...contract, payment, event, assessment, ...signature];
}

/** May the demo clock move to `requestedDay`? Refused before the latest recorded day. */
export async function checkDemoClockFloor(
  db: PrismaClient,
  requestedDay: string
): Promise<ClockFloorResult> {
  return checkClockFloor(requestedDay, await recordedBusinessDays(db));
}

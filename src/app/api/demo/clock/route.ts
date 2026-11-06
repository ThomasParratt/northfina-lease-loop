// POST /api/demo/clock   body: { "asOf": "2026-09-15" } to travel, { "asOf": null } to go back.
// Sets or clears the demo clock cookie; every page and route reads it once per request
// through todayForRequest(). The only endpoint that accepts a date from the browser.
// Never earlier than the latest business day already recorded (D90): 409 CLOCK_BEFORE_RECORDS
// with `{ code: 'clock_before_records', params: { latestDay } }`, and the cookie is left alone.
// The scenario card runner sets the clock itself on the cards' scripted days and is exempt.
import { fail, handleRoute, ok, readJsonBody } from '@/server/api-response';
import { db } from '@/server/db';
import { demoClockCookieHeader } from '@/server/demo-clock';
import { checkDemoClockFloor } from '@/server/demo-clock-floor';
import { demoClockBodySchema } from '@/server/routes';
import { todayIso } from '@/server/today';

export const POST = handleRoute(async (request) => {
  const { asOf } = await readJsonBody(request, demoClockBodySchema);
  const today = asOf ?? todayIso();
  const floor = await checkDemoClockFloor(db, today);
  if (!floor.ok) {
    return fail(
      409,
      'CLOCK_BEFORE_RECORDS',
      'Records exist after this day; the clock cannot go before them',
      floor.reason
    );
  }
  const headers = { 'Set-Cookie': demoClockCookieHeader(asOf) };
  return ok({ asOf, today }, { headers });
});

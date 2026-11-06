// The demo clock's floor (D90). Time travel does not undo records, so travelling back past a
// day something was already written on would make impossible states: a payment before its
// contract, a quote dated after the contract. Manual time travel therefore never goes earlier
// than the latest business day already recorded. The caller reads the recorded days (only days
// on which something happened, never a planned day such as a start date or a due date) and the
// requested day; this module only compares. ISO `YYYY-MM-DD` strings sort as their days do.

export type ClockFloorRefusal = {
  code: 'clock_before_records';
  params: { latestDay: string };
};

export type ClockFloorResult = { ok: true } | { ok: false; reason: ClockFloorRefusal };

/** The latest of the recorded days, or null when nothing is recorded. Nulls are empty columns. */
export function latestRecordedDay(days: readonly (string | null)[]): string | null {
  let latest: string | null = null;
  for (const day of days) {
    if (day !== null && (latest === null || day > latest)) latest = day;
  }
  return latest;
}

/**
 * May the clock move to `requestedDay`? Yes on or after the latest recorded day, or when nothing
 * is recorded; otherwise refused with that day, for the message "Records exist up to {date}".
 */
export function checkClockFloor(
  requestedDay: string,
  recordedDays: readonly (string | null)[]
): ClockFloorResult {
  const latestDay = latestRecordedDay(recordedDays);
  if (latestDay === null || requestedDay >= latestDay) return { ok: true };
  return { ok: false, reason: { code: 'clock_before_records', params: { latestDay } } };
}

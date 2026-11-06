// D90: manual time travel never goes earlier than the latest business day already recorded,
// so a payment can never sit before its contract or a quote after it. Travel 2 months forward,
// sign there, travel 1 month back: refused. With nothing written it is allowed.
import { describe, expect, it } from 'vitest';
import { checkClockFloor, latestRecordedDay } from './floor';

describe('latestRecordedDay', () => {
  it('is null with no records', () => {
    expect(latestRecordedDay([])).toBeNull();
    expect(latestRecordedDay([null, null])).toBeNull();
  });

  it('is the latest of the days, skipping the empty columns', () => {
    expect(latestRecordedDay(['2026-11-05', null, '2027-01-05', '2026-12-31'])).toBe('2027-01-05');
  });

  it('compares across a year end and a leap day', () => {
    expect(latestRecordedDay(['2027-12-31', '2028-02-29', '2028-01-01'])).toBe('2028-02-29');
  });
});

describe('checkClockFloor', () => {
  it('allows any day with no records, the earliest card day included', () => {
    expect(checkClockFloor('2026-01-31', [])).toEqual({ ok: true });
    expect(checkClockFloor('2026-01-31', [null])).toEqual({ ok: true });
  });

  it('allows the latest recorded day itself', () => {
    expect(checkClockFloor('2027-01-05', ['2026-11-05', '2027-01-05'])).toEqual({ ok: true });
  });

  it('refuses the day before the latest recorded day, with that day as the param', () => {
    expect(checkClockFloor('2027-01-04', ['2026-11-05', '2027-01-05'])).toEqual({
      ok: false,
      reason: { code: 'clock_before_records', params: { latestDay: '2027-01-05' } },
    });
  });

  it('refuses one month back after signing two months forward', () => {
    // Real day 2026-11-06, travelled to 2027-01-06 and signed there, then back to 2026-12-06.
    expect(checkClockFloor('2026-12-06', ['2027-01-06'])).toEqual({
      ok: false,
      reason: { code: 'clock_before_records', params: { latestDay: '2027-01-06' } },
    });
  });

  it('allows a forward request', () => {
    expect(checkClockFloor('2028-02-29', ['2026-11-05', '2027-01-05'])).toEqual({ ok: true });
  });
});

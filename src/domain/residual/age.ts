// The age of an item for the residual curve (decision D11): whole months from 1 January of its
// model year to the valuation day, because the data pack has no first-lease date. A month
// counts from its first day, so a 2026 model is 0 months old all of January 2026 and 17 on
// any day of June 2027. A model year after the valuation day (a 2027 model sold in 2026) is
// age 0, never negative. ISO day strings in, no clock.

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(isoDay: string): [number, number, number] {
  const match = ISO_DAY.exec(isoDay);
  if (!match) throw new RangeError(`isoDay must be YYYY-MM-DD, got ${isoDay}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** D11: whole months from 1 January of `modelYear` to `isoDay`, at least 0. */
export function ageInMonths(modelYear: number, isoDay: string): number {
  if (!Number.isSafeInteger(modelYear)) {
    throw new RangeError(`modelYear must be a whole year, got ${modelYear}`);
  }
  const [year, month] = parts(isoDay);
  return Math.max(0, (year - modelYear) * 12 + (month - 1));
}

/**
 * Whole months from `fromIso` to `toIso`: a month is complete on the same day of the month as
 * the start (clamped to the last day of a shorter month, as the invoice periods are, D3).
 * 0 when `toIso` is not after `fromIso`. For comparisons such as "months since the first
 * lease"; D11 itself uses `ageInMonths`.
 */
export function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = parts(fromIso);
  const [ty, tm, td] = parts(toIso);
  let months = (ty - fy) * 12 + (tm - fm);
  const anniversary = Math.min(fd, daysInMonth(ty, tm));
  if (td < anniversary) months -= 1;
  return Math.max(0, months);
}

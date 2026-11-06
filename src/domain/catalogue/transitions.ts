// The asset status transitions of D22 (docs/decisions.md), as data. An item is held
// (`reserved`) or leased from `available`; a lease ends `returned` or `sold`; second life puts a
// returned item back to `available`; `sold` leaves the loop, so nothing goes out of it.
import { assetStatusSchema, type AssetStatus } from '@/data/schemas';

export const ASSET_STATUS_TRANSITIONS: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = {
  available: ['reserved', 'leased'],
  reserved: ['available'],
  leased: ['returned', 'sold'],
  returned: ['available'],
  sold: [],
};

export type AssetStatusChangeRefusal = {
  code: 'transition_not_allowed' | 'transition_by_event_only';
  params: { from: AssetStatus; to: AssetStatus };
};

/**
 * What the admin may change by hand (review finding 4): hold and release. `leased`, `returned`,
 * `sold` and the relisting are written only by their events (signing, exit, assessment), so a
 * manual change can never pull an asset from under an active contract or lease it without one.
 */
export const MANUAL_STATUS_TRANSITIONS: Readonly<
  Partial<Record<AssetStatus, readonly AssetStatus[]>>
> = { available: ['reserved'], reserved: ['available'] };

/**
 * Whether an asset may go from `from` to `to`. Both are parsed first (a value outside the list
 * throws); a change to the same status is refused, since there is nothing to change.
 */
export function checkAssetStatusChange(
  from: string,
  to: string
): { ok: true } | { ok: false; reason: AssetStatusChangeRefusal } {
  const current = assetStatusSchema.parse(from);
  const next = assetStatusSchema.parse(to);
  if (ASSET_STATUS_TRANSITIONS[current].includes(next)) return { ok: true };
  return {
    ok: false,
    reason: { code: 'transition_not_allowed', params: { from: current, to: next } },
  };
}

/** `checkAssetStatusChange`, then only the manual transitions: the admin's status route. */
export function checkManualAssetStatusChange(
  from: string,
  to: string
): { ok: true } | { ok: false; reason: AssetStatusChangeRefusal } {
  const check = checkAssetStatusChange(from, to);
  if (!check.ok) return check;
  const current = assetStatusSchema.parse(from);
  const next = assetStatusSchema.parse(to);
  if (MANUAL_STATUS_TRANSITIONS[current]?.includes(next)) return { ok: true };
  return {
    ok: false,
    reason: { code: 'transition_by_event_only', params: { from: current, to: next } },
  };
}

// The tamper-evident audit chain (docs/features/audit-chain.md, D30).
//
//   hash = SHA-256 hex of  prevHash + '\n' + canonicalJson(entry)
//
// where prevHash is the hash of the row before (GENESIS_HASH for the first hashed row) and the
// entry is { actor, action, entityType, entityId, details, createdAt }. Editing any field of a
// row, re-timing it, deleting it or moving it breaks the row's own hash or the next row's
// prevHash. Tamper-evident, not tamper-proof: someone who can rewrite the whole table can
// recompute every hash, which is what anchoring the head outside the database answers.
// node:crypto's createHash is deterministic: no clock, randomness or I/O.
import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical';

/** The prevHash of the first hashed row: 64 zeros. */
export const GENESIS_HASH = '0'.repeat(64);

/** What a row's hash covers. `createdAt` is an ISO instant passed in; the domain reads no clock. */
export type AuditChainEntry = {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  /** The stored details as parsed from details_json, or null for none. */
  details: unknown;
  createdAt: string;
};

/** A stored row. `hash` and `prevHash` are null on a legacy row written before the chain. */
export type AuditChainRow = AuditChainEntry & {
  id: number;
  prevHash: string | null;
  hash: string | null;
};

export type AuditChainBreak = 'prev_hash_mismatch' | 'hash_mismatch' | 'gap_before_chain';

export type AuditChainVerdict =
  | { ok: true; length: number; legacyRows: number; headHash: string }
  | { ok: false; brokenAt: number; reason: AuditChainBreak };

/** The hash of `entry` chained to `prevHash`. */
export function hashAuditEntry(prevHash: string, entry: AuditChainEntry): string {
  const canonical = canonicalJson({
    actor: entry.actor,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details,
    createdAt: entry.createdAt,
  });
  return createHash('sha256').update(`${prevHash}\n${canonical}`, 'utf8').digest('hex');
}

/**
 * Walks `rows` in id order and names the first broken row. Unhashed rows are allowed only as a
 * prefix (the rows from before the migration); `length` counts every row, `legacyRows` that
 * prefix, and `headHash` is the last row's hash (GENESIS_HASH when nothing is hashed yet).
 */
export function verifyAuditChain(rows: readonly AuditChainRow[]): AuditChainVerdict {
  let headHash = GENESIS_HASH;
  let legacyRows = 0;
  let chained = false;
  for (const row of rows) {
    if (row.hash === null) {
      if (chained) return { ok: false, brokenAt: row.id, reason: 'gap_before_chain' };
      legacyRows += 1;
      continue;
    }
    chained = true;
    if (row.prevHash !== headHash) {
      return { ok: false, brokenAt: row.id, reason: 'prev_hash_mismatch' };
    }
    if (hashAuditEntry(row.prevHash, row) !== row.hash) {
      return { ok: false, brokenAt: row.id, reason: 'hash_mismatch' };
    }
    headHash = row.hash;
  }
  return { ok: true, length: rows.length, legacyRows, headHash };
}

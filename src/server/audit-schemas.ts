// Zod schemas of the audit chain route (contract first, docs/features/audit-chain.md): the
// verdict of walking the hash chain. The row that uses it is in routes.ts.
import { z } from 'zod';

const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

/** Why a row breaks the chain: its prevHash, its own hash, or an unhashed row inside it. */
export const auditChainBreakSchema = z.enum([
  'prev_hash_mismatch',
  'hash_mismatch',
  'gap_before_chain',
]);

/**
 * `GET /api/audit-log/verify`: intact with the row count, the legacy prefix (rows from before
 * the chain) and the head hash to copy as an anchor, or broken at the first bad row's id.
 */
export const auditChainVerdictSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    length: z.number().int().nonnegative(),
    legacyRows: z.number().int().nonnegative(),
    headHash: sha256HexSchema,
  }),
  z.object({
    ok: z.literal(false),
    brokenAt: z.number().int(),
    reason: auditChainBreakSchema,
  }),
]);

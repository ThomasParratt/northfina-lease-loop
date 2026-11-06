// Zod schemas of the second-life route (contract first): `POST /api/assets/[id]/assessments`
// assesses a returned asset on the request's day and relists it (admin only, D12, D13, D61).
// The row that uses them is in routes.ts. No body: the day and the actor are the server's.
import { z } from 'zod';
import { assetConditionSchema, centsSchema, isoDateSchema } from '@/data/schemas';

export const assessmentParamsSchema = z.object({ id: z.string().min(1) });

const outcomeSchema = z.object({
  code: z.string(),
  params: z.record(z.string(), z.unknown()),
});

/** The success `data`: the decision and its numbers; the full D12 options and D13 steps too. */
export const assessmentResponseSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  contractId: z.string().nullable(),
  assessedOn: isoDateSchema,
  returnedCondition: assetConditionSchema,
  newCondition: assetConditionSchema,
  refurbish: z.boolean(),
  marketValueCents: centsSchema,
  refurbishmentCents: centsSchema,
  secondLifeFinancedCents: centsSchema,
  matchedDemandId: z.string().nullable(),
  decision: outcomeSchema,
  verdicts: z.array(z.object({ demandId: z.string(), outcome: outcomeSchema })),
  ranking: z.array(
    z.object({
      demandId: z.string(),
      rank: z.number().int().positive(),
      decidedBy: z.string().nullable(),
      monthlyNetCents: centsSchema,
      termMonths: z.number().int().positive(),
    })
  ),
});
export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;

// The route table: one row per API route, with the Zod schemas of its params, query, body and
// success response (the `data` inside the `ok()` envelope). Route files import their schemas
// from here, `src/server/openapi.ts` turns the table into docs/openapi.json
// (`npm run openapi`), and routes.test.ts fails when a route.ts has no row or a row no file.
//
// Contract first (AGENTS.md, team rule 2): a slice's first commit adds its row here.
import { z } from 'zod';
import { assetCategorySchema, assetSchema, assetStatusSchema } from '@/data/schemas';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RouteDefinition = {
  method: HttpMethod;
  /** The Next.js pattern, e.g. `/api/assets/[id]/status`. */
  path: string;
  summary: string;
  /** Groups the route in the OpenAPI document; one tag per slice. */
  tag: string;
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  /** The `data` of the success envelope. */
  response: z.ZodType;
  /** The success status; 200 when not set. */
  status?: number;
};

// ---------- assets ----------

export const listAssetsQuerySchema = z.object({ category: assetCategorySchema.optional() });

export const assetIdParamsSchema = z.object({ id: z.string().min(1) });

export const changeAssetStatusBodySchema = z.strictObject({
  status: assetStatusSchema,
  actor: z.string().trim().min(1).max(100),
});

// ---------- audit log ----------

export const auditLogEntrySchema = z.object({
  id: z.number().int(),
  created_at: z.iso.datetime(),
  actor: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  details: z.unknown(),
});

// ---------- the table ----------

export const ROUTES: readonly RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/assets',
    summary: 'List the assets in the catalogue, optionally of one category',
    tag: 'assets',
    query: listAssetsQuerySchema,
    response: z.array(assetSchema),
  },
  {
    method: 'PATCH',
    path: '/api/assets/[id]/status',
    summary: "Change an asset's status and write the audit row in the same transaction",
    tag: 'assets',
    params: assetIdParamsSchema,
    body: changeAssetStatusBodySchema,
    response: assetSchema,
  },
  {
    method: 'GET',
    path: '/api/audit-log',
    summary: 'The 50 newest audit rows, newest first',
    tag: 'audit',
    response: z.array(auditLogEntrySchema),
  },
];

/** `METHOD /api/…`, the key of a row. */
export function routeKey(route: Pick<RouteDefinition, 'method' | 'path'>): string {
  return `${route.method} ${route.path}`;
}

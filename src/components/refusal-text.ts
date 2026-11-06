// An API refusal written in the visitor's language (review finding 5): the envelope's
// `error.code`, or for a 401/403 `FORBIDDEN` the authorization reason's code in `details`
// (D74), looked up in labels the page built from the message files. Anything else: `error`.

/** Error code (or authorization reason code) → sentence; `error` for anything else. */
export type RefusalLabels = Record<string, string> & { error: string };

type Failure = { error?: { code?: unknown; details?: { code?: unknown } } };

export function refusalText(body: unknown, labels: RefusalLabels): string {
  const error = (body as Failure | null)?.error;
  const code = error?.code === 'FORBIDDEN' ? error.details?.code : error?.code;
  return (typeof code === 'string' && Object.hasOwn(labels, code) && labels[code]) || labels.error;
}

// What the public audit log shows (docs/features/security.md). The chain stores every detail,
// so the hash holds; the page and the route hand a visitor a copy with the personal fields
// masked. A field is personal by its key, wherever it sits in the details: what the apply form
// and the signatory list took from a person. The admin reads the stored row. Pure: the input is
// never changed, a new value comes back.

/** The keys masked for a visitor: the question flow's reason params and the signatory rows. */
export const PRIVATE_DETAIL_KEYS: readonly string[] = [
  'birthDate',
  'monthlyNetIncomeCents',
  'incomeCents',
  'revenueCents',
  'businessId',
  'country',
  'email',
  'signingLinkTo',
  'by',
];

/** What a masked value reads as. */
export const MASKED = '•••';

const SIGNATORY_ACTOR = 'signatory:';

/** `details` with every private key's value replaced by the mask, at any depth. */
export function redactAuditDetails(details: unknown): unknown {
  if (Array.isArray(details)) return details.map(redactAuditDetails);
  if (details !== null && typeof details === 'object') {
    return Object.fromEntries(
      Object.entries(details).map(([key, value]) => [
        key,
        PRIVATE_DETAIL_KEYS.includes(key) ? MASKED : redactAuditDetails(value),
      ])
    );
  }
  return details;
}

/** A signatory acts under an e-mail address (`signatory:<email>`); a visitor sees it masked. */
export function redactAuditActor(actor: string): string {
  return actor.startsWith(SIGNATORY_ACTOR) ? `${SIGNATORY_ACTOR}${MASKED}` : actor;
}

/** One audit entry as a visitor may see it. */
export function redactAuditEntry<T extends { actor: string; details: unknown }>(entry: T): T {
  return {
    ...entry,
    actor: redactAuditActor(entry.actor),
    details: redactAuditDetails(entry.details),
  };
}

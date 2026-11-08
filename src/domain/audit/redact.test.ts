import { describe, expect, it } from 'vitest';
import { MASKED, redactAuditActor, redactAuditDetails, redactAuditEntry } from './redact';

describe('redactAuditDetails', () => {
  it('masks a private key at any depth and leaves the rest as it is', () => {
    const details = {
      quoteId: 'q-1',
      decision: 'rejected',
      reasons: [
        { code: 'too_young', params: { birthDate: '2009-03-10', eighteenOn: '2027-03-10' } },
        { code: 'income_implausible', params: { incomeCents: 9_000_000, ceilingCents: 5_000_000 } },
      ],
      signingLinkTo: 'signatory@norvi.example.com',
    };
    expect(redactAuditDetails(details)).toEqual({
      quoteId: 'q-1',
      decision: 'rejected',
      reasons: [
        { code: 'too_young', params: { birthDate: MASKED, eighteenOn: '2027-03-10' } },
        { code: 'income_implausible', params: { incomeCents: MASKED, ceilingCents: 5_000_000 } },
      ],
      signingLinkTo: MASKED,
    });
  });

  it('never changes the stored value', () => {
    const details = { email: 'a@b.fi', nested: [{ businessId: '1234567-8' }] };
    const copy = structuredClone(details);
    redactAuditDetails(details);
    expect(details).toEqual(copy);
  });

  it.each([null, undefined, 'a string', 12, true])('passes %s through', (value) => {
    expect(redactAuditDetails(value)).toBe(value);
  });

  it('keeps an empty object and an empty array', () => {
    expect(redactAuditDetails({})).toEqual({});
    expect(redactAuditDetails([])).toEqual([]);
  });
});

describe('redactAuditActor', () => {
  it('masks the e-mail of a signatory acting through the signing link', () => {
    expect(redactAuditActor('signatory:signatory@norvi.example.com')).toBe(`signatory:${MASKED}`);
  });

  it.each(['admin', 'cust-aino', 'anonymous'])('leaves %s alone', (actor) => {
    expect(redactAuditActor(actor)).toBe(actor);
  });
});

describe('redactAuditEntry', () => {
  it('masks the actor and the details and keeps every other field', () => {
    const entry = {
      id: 7,
      created_at: '2026-11-05T10:00:00.000Z',
      actor: 'signatory:a@b.fi',
      action: 'application.decided',
      entity_type: 'application',
      entity_id: 'app-1',
      details: { from: 'awaiting_signatory', to: 'approved', by: 'a@b.fi', via: 'signing_link' },
    };
    expect(redactAuditEntry(entry)).toEqual({
      ...entry,
      actor: `signatory:${MASKED}`,
      details: { from: 'awaiting_signatory', to: 'approved', by: MASKED, via: 'signing_link' },
    });
  });
});

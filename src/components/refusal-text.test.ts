// refusalText: the decision and signing-link forms show the server's refusal, not one generic
// error (review finding 5).
import { describe, expect, it } from 'vitest';
import { refusalText } from './refusal-text';

const labels = {
  error: 'Something went wrong.',
  APPLICATION_NOT_PENDING: 'Already decided.',
  SIGNING_LINK_USED: 'This link was used.',
  admin_only: 'Only an admin can do this.',
};

describe('refusalText', () => {
  it('writes the envelope code', () => {
    const body = { success: false, error: { code: 'SIGNING_LINK_USED', message: 'x' } };
    expect(refusalText(body, labels)).toBe('This link was used.');
  });

  it("writes a FORBIDDEN refusal from the authorization reason's code (D74)", () => {
    const body = { error: { code: 'FORBIDDEN', details: { code: 'admin_only', params: {} } } };
    expect(refusalText(body, labels)).toBe('Only an admin can do this.');
  });

  it('falls back to the generic error for an unknown code, no body or a prototype key', () => {
    expect(refusalText({ error: { code: 'NEW_CODE' } }, labels)).toBe('Something went wrong.');
    expect(refusalText(null, labels)).toBe('Something went wrong.');
    expect(refusalText({ error: { code: 'toString' } }, labels)).toBe('Something went wrong.');
  });
});

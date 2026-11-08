// Every response carries the security headers (docs/features/security.md); the signing page adds
// a stricter referrer policy, since its token is in the URL.
import { describe, expect, it } from 'vitest';
import config from '../next.config';

async function rules() {
  if (!config.headers) throw new Error('next.config.ts sets no headers');
  return config.headers();
}

describe('the security headers', () => {
  it('every route gets the policy, nosniff, no framing, a referrer policy and a permissions policy', async () => {
    const all = (await rules()).find((rule) => rule.source === '/(.*)');
    const keys = all?.headers.map((header) => header.key) ?? [];
    expect(keys).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ])
    );
    const csp = all?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
    expect(csp).not.toMatch(/https?:/);
  });

  it('allows eval only outside a production build, and sends HSTS only in one', async () => {
    const all = (await rules()).find((rule) => rule.source === '/(.*)');
    const csp = all?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;
    const production = process.env.NODE_ENV === 'production';
    expect(csp?.includes("'unsafe-eval'")).toBe(!production);
    expect(all?.headers.some((header) => header.key === 'Strict-Transport-Security')).toBe(
      production
    );
  });

  it('the signing page sends no referrer', async () => {
    const sign = (await rules()).find((rule) => rule.source === '/:locale/sign/:path*');
    expect(sign?.headers).toEqual([{ key: 'Referrer-Policy', value: 'no-referrer' }]);
  });
});

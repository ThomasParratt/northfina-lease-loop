// The outside anchor script (D80): the pure pieces. The outside call itself is never made in a
// test; docs/features/audit-chain.md has the run against freetsa.org.
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  filesOfStatement,
  logStillHas,
  parseAnchorArgs,
  parseStatement,
  postArgs,
  queryArgs,
  stampFiles,
  statementText,
  timeOfReply,
  verifyArgs,
} from './anchor-audit-tsa.mjs';

const hash = 'c'.repeat(64);

describe('parseAnchorArgs', () => {
  it('stamps by default and verifies a named statement', () => {
    expect(parseAnchorArgs([])).toEqual({ mode: 'stamp' });
    expect(parseAnchorArgs(['--verify', 'audit-tsa/head-3.txt'])).toEqual({
      mode: 'verify',
      statement: 'audit-tsa/head-3.txt',
    });
  });

  it('refuses anything else', () => {
    expect(() => parseAnchorArgs(['--verify'])).toThrow('usage');
    expect(() => parseAnchorArgs(['stamp'])).toThrow('usage');
  });
});

describe('the statement', () => {
  it('names the length, the head hash and the public key, and reads back', () => {
    const text = statementText({ length: 3, hash, publicKey: 'MCowBQ==' });
    expect(text).toBe(
      `Lease Loop audit log head (docs/features/audit-chain.md)\nlength: 3\nhash: ${hash}\npublic key: MCowBQ==\n`
    );
    expect(parseStatement(text)).toEqual({ length: 3, hash });
  });

  it('refuses a file that is not a statement', () => {
    expect(() => parseStatement('hello')).toThrow('not an audit head statement');
    expect(() => parseStatement(`length: 0\nhash: ${hash}`)).toThrow();
  });
});

describe('the files and the commands', () => {
  const files = stampFiles('/x/audit-tsa', 3);

  it('keeps the statement, the request and the reply side by side', () => {
    expect(files).toEqual({
      statement: path.join('/x/audit-tsa', 'head-3.txt'),
      query: path.join('/x/audit-tsa', 'head-3.tsq'),
      reply: path.join('/x/audit-tsa', 'head-3.tsr'),
    });
    expect(filesOfStatement(files.statement)).toEqual(files);
  });

  it('asks for a SHA-256 stamp with the certificate, and posts it with a deadline', () => {
    expect(queryArgs(files)).toEqual([
      'ts',
      '-query',
      '-data',
      files.statement,
      '-sha256',
      '-cert',
      '-out',
      files.query,
    ]);
    const post = postArgs('https://tsa.example/tsr', files);
    expect(post).toContain('--max-time');
    expect(post).toContain(`@${files.query}`);
    expect(post.at(-1)).toBe('https://tsa.example/tsr');
  });

  it('verifies against the CA, with the authority certificate when one is given', () => {
    expect(verifyArgs(files, 'ca.pem', null)).toEqual([
      'ts',
      '-verify',
      '-data',
      files.statement,
      '-in',
      files.reply,
      '-CAfile',
      'ca.pem',
    ]);
    expect(verifyArgs(files, 'ca.pem', 'tsa.crt').slice(-2)).toEqual(['-untrusted', 'tsa.crt']);
  });

  it('reads the time from the reply text', () => {
    expect(timeOfReply('Serial number: 0x1\nTime stamp: Nov  6 07:59:30 2026 GMT\n')).toBe(
      'Nov  6 07:59:30 2026 GMT'
    );
    expect(timeOfReply('nothing')).toBeNull();
  });
});

describe('logStillHas', () => {
  it('is true while the row at that length keeps the stamped hash, longer logs included', () => {
    expect(logStillHas(['a', hash], { length: 2, hash })).toBe(true);
    expect(logStillHas(['a', hash, 'd'], { length: 2, hash })).toBe(true);
  });

  it('is false for a rewritten row or a log cut below the stamp', () => {
    expect(logStillHas(['a', 'b'], { length: 2, hash })).toBe(false);
    expect(logStillHas(['a'], { length: 2, hash })).toBe(false);
  });
});

// Creates a Prisma client for a SQLite file. Prisma 7 talks to SQLite through a
// "driver adapter" (better-sqlite3) instead of a built-in engine.
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

/** The SQLite file each client opened, so the audit anchors can sit beside it (D80). */
const databaseFiles = new WeakMap<PrismaClient, string>();

/** `databaseUrl` looks like `file:./dev.db`; a relative path is resolved from the current folder. */
export function createPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Run `npm run db:setup` to create .env and the database.'
    );
  }
  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }) });
  const file = sqliteFileOf(databaseUrl);
  if (file) databaseFiles.set(client, file);
  return client;
}

/** The absolute path of a `file:` URL's database; null for anything else (`:memory:`). */
export function sqliteFileOf(databaseUrl: string): string | null {
  if (!databaseUrl.startsWith('file:')) return null;
  const file = databaseUrl.slice('file:'.length).split('?')[0]!;
  if (file === '' || file === ':memory:') return null;
  return path.resolve(file);
}

/** The file `client` was created on, or null when it was not made by createPrismaClient. */
export function databaseFileOf(client: PrismaClient): string | null {
  return databaseFiles.get(client) ?? null;
}

export type { PrismaClient };

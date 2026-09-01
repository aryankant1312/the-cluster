import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Minimal SQL driver seam. Hosting is undecided, so the app talks to this
 * interface and never to a concrete database.
 *
 * Callers always write `?` placeholders — the SQLite dialect. The Postgres
 * driver rewrites them to `$1..$n` on the way through, which keeps every
 * query in the repositories dialect-free.
 */
export interface SqlDriver {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
  readonly dialect: "sqlite" | "postgres";
}

function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/* ------------------------------------------------------------------ SQLite */

/**
 * Built into Node 22.5+ as `node:sqlite`, so there is no native module to
 * compile — which matters on Windows, where better-sqlite3 prebuilds are a
 * common source of install failures.
 */
async function createSqliteDriver(): Promise<SqlDriver> {
  const { DatabaseSync } = await import("node:sqlite");
  // `turbopackIgnore` keeps this dynamic path out of the build's static
  // analysis. Without it Turbopack cannot prove where the path points, so it
  // traces the entire project — public/ included — into the serverless
  // bundle, which bloats the deploy and can trip the platform size limit.
  //
  // Nothing is lost by opting out: SQLite is the local-development driver.
  // Production runs Postgres, where this function is never reached.
  const file = resolve(/* turbopackIgnore: true */ process.env.SQLITE_PATH ?? ".data/cluster.db");
  mkdirSync(dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  return {
    dialect: "sqlite",
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...(params as never[])) as T | undefined;
    },
    async run(sql: string, params: unknown[] = []) {
      db.prepare(sql).run(...(params as never[]));
    },
  };
}

/* ---------------------------------------------------------------- Postgres */

/**
 * `pg` is imported lazily and is deliberately NOT a dependency yet: nothing
 * needs installing until DATABASE_DRIVER=postgres is actually chosen.
 */
async function createPostgresDriver(): Promise<SqlDriver> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_DRIVER=postgres requires DATABASE_URL to be set.");
  }

  type PgPool = {
    query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
  };
  let pool: PgPool;
  try {
    const pg = (await import("pg")) as unknown as {
      Pool: new (config: { connectionString: string }) => PgPool;
    };
    pool = new pg.Pool({ connectionString: url });
  } catch {
    throw new Error(
      "DATABASE_DRIVER=postgres needs the 'pg' package. Run: npm i pg",
    );
  }

  return {
    dialect: "postgres",
    async all<T>(sql: string, params: unknown[] = []) {
      const res = await pool.query(toPositional(sql), params);
      return res.rows as T[];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      const res = await pool.query(toPositional(sql), params);
      return res.rows[0] as T | undefined;
    },
    async run(sql: string, params: unknown[] = []) {
      await pool.query(toPositional(sql), params);
    },
  };
}

/* --------------------------------------------------------------- Selection */

let driverPromise: Promise<SqlDriver> | null = null;

/** Process-wide singleton; the dev server hot-reloads modules, not this. */
export function getDriver(): Promise<SqlDriver> {
  if (!driverPromise) {
    driverPromise =
      process.env.DATABASE_DRIVER === "postgres"
        ? createPostgresDriver()
        : createSqliteDriver();
  }
  return driverPromise;
}

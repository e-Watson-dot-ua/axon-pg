import fs from 'node:fs/promises';
import path from 'node:path';
import { trimQuery } from './utils/sql.utils.js';

/**
 * Run pending database migrations.
 *
 * Migration files are `.sql` files in a directory, sorted by name.
 * Applied migrations are tracked in a `_migrations` table (configurable).
 *
 * @param {import('./index.js').Db} db
 * @param {import('./types.js').MigrateOptions} opts
 * @param {any} [log] - logger instance
 * @returns {Promise<string[]>} list of applied migration names
 */
export async function migrate(db, opts, log) {
  const dir = path.resolve(opts.dir);
  const table = opts.table ?? '_migrations';

  log?.info('running migrations', { dir, table });

  // Ensure tracking table exists
  await db.raw(`
    CREATE TABLE IF NOT EXISTS "${table}" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const applied = await db.raw(`SELECT name FROM "${table}" ORDER BY id`);
  const appliedSet = new Set(applied.rows.map((r) => r.name));

  // Discover migration files
  const entries = await fs.readdir(dir);
  const sqlFiles = entries
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Run pending migrations
  /** @type {string[]} */
  const ran = [];

  for (const file of sqlFiles) {
    const name = file.replace(/\.sql$/, '');
    if (appliedSet.has(name)) {
      log?.trace('migration already applied', { name });
      continue;
    }

    const sql = trimQuery(await fs.readFile(path.join(dir, file), 'utf8'));

    log?.info('applying migration', { name });
    await db.transaction(async (tx) => {
      await tx.raw(sql);
      await tx.raw(
        `INSERT INTO "${table}" (name) VALUES ($1)`,
        [name],
      );
    });

    ran.push(name);
  }

  log?.info('migrations complete', { applied: ran.length, total: sqlFiles.length });
  return ran;
}

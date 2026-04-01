import { Pool } from './pool.js';
import { loadQueries } from './query.loader.js';
import { createRunner } from './query.runner.js';
import { transaction } from './transaction.js';
import { resolveLogger } from './utils/logger.utils.js';

export { PgError } from './errors/pg.error.js';
export { axonPg } from './plugin.js';

/**
 * The Db class — main entry point for database operations.
 */
export class Db {
  /** @type {Pool} */
  #pool;
  /** @type {Map<string, string>} */
  #queries;
  /** @type {import('./types.js').TxClient} */
  #runner;
  /** @type {any} */
  #log;

  /**
   * @param {Pool} pool
   * @param {Map<string, string>} queries
   * @param {any} [log] - logger instance
   */
  constructor(pool, queries, log) {
    this.#pool = pool;
    this.#queries = queries;
    this.#log = log;
    this.#runner = createRunner(queries, pool, log);
  }

  /**
   * Execute a named query, return full result.
   * @param {string} name
   * @param {any[]} [params]
   */
  query(name, params) {
    return this.#runner.query(name, params);
  }

  /**
   * Execute a named query, return first row or null.
   * @param {string} name
   * @param {any[]} [params]
   */
  one(name, params) {
    return this.#runner.one(name, params);
  }

  /**
   * Execute a named query, return all rows.
   * @param {string} name
   * @param {any[]} [params]
   */
  many(name, params) {
    return this.#runner.many(name, params);
  }

  /**
   * Execute a named query, return rowCount.
   * @param {string} name
   * @param {any[]} [params]
   */
  exec(name, params) {
    return this.#runner.exec(name, params);
  }

  /**
   * Execute raw SQL (not from file).
   * @param {string} sql
   * @param {any[]} [params]
   */
  raw(sql, params) {
    return this.#runner.raw(sql, params);
  }

  /**
   * Run a function within a transaction.
   * @param {(tx: import('./types.js').TxClient) => Promise<any>} fn
   */
  transaction(fn) {
    return transaction(this.#pool, this.#queries, fn, this.#log);
  }

  /**
   * Health check.
   * @returns {Promise<boolean>}
   */
  ping() {
    return this.#pool.ping();
  }

  /**
   * Close the connection pool.
   * @returns {Promise<void>}
   */
  close() {
    return this.#pool.close();
  }
}

/**
 * Create a new Db instance.
 *
 * @param {import('./types.js').DbOptions} opts
 * @returns {Promise<Db>}
 */
export async function createDb(opts) {
  const log = opts.logger ?? await resolveLogger({ level: 'debug' });

  const poolConfig = typeof opts.connection === 'string'
    ? { connectionString: opts.connection, ...(opts.pool ?? {}) }
    : { ...opts.connection, ...(opts.pool ?? {}) };

  log.info('creating database pool', { sqlDir: opts.sqlDir });

  const pool = new Pool(poolConfig, log);
  await pool.connect();

  const queries = await loadQueries(opts.sqlDir);
  log.info('loaded SQL queries', { count: queries.size });

  return new Db(pool, queries, log);
}

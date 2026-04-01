import pg from 'pg';
import { PgError } from './errors/pg.error.js';

/**
 * Wrapper around pg.Pool with lifecycle management.
 */
export class Pool {
  /** @type {pg.Pool} */
  #pool;
  /** @type {any} */
  #log;

  /**
   * @param {string | Object} config - connection string or pg.PoolConfig
   * @param {any} [log] - logger instance
   */
  constructor(config, log) {
    const opts = typeof config === 'string' ? { connectionString: config } : config;
    this.#pool = new pg.Pool(opts);
    this.#log = log;
  }

  /** The underlying pg.Pool instance. */
  get native() {
    return this.#pool;
  }

  /**
   * Verify the connection with SELECT 1.
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      await this.#pool.query('SELECT 1');
      this.#log?.info('database connected');
    } catch (err) {
      this.#log?.error('database connection failed', { error: /** @type {Error} */ (err).message });
      throw new PgError('Failed to connect to database', { cause: /** @type {Error} */ (err) });
    }
  }

  /**
   * Health check.
   * @returns {Promise<boolean>}
   */
  async ping() {
    try {
      await this.#pool.query('SELECT 1');
      this.#log?.debug('ping ok');
      return true;
    } catch {
      this.#log?.warn('ping failed');
      return false;
    }
  }

  /**
   * Execute a query on the pool.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<pg.QueryResult>}
   */
  query(sql, params) {
    return this.#pool.query(sql, params);
  }

  /**
   * Checkout a client for transaction use.
   * @returns {Promise<pg.PoolClient>}
   */
  checkout() {
    return this.#pool.connect();
  }

  /**
   * Close the pool.
   * @returns {Promise<void>}
   */
  async close() {
    this.#log?.info('closing database pool');
    await this.#pool.end();
  }
}

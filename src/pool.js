import pg from 'pg';
import { PgError } from './errors/pg.error.js';

/**
 * Wrapper around pg.Pool with lifecycle management.
 */
export class Pool {
  /** @type {pg.Pool} */
  #pool;

  /**
   * @param {string | Object} config - connection string or pg.PoolConfig
   */
  constructor(config) {
    const opts = typeof config === 'string' ? { connectionString: config } : config;
    this.#pool = new pg.Pool(opts);
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
    } catch (err) {
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
      return true;
    } catch {
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
  close() {
    return this.#pool.end();
  }
}

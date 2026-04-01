import { PgError } from './errors/pg.error.js';

/**
 * Create a query runner bound to a query map and an executor (pool or client).
 *
 * @param {Map<string, string>} queries - loaded SQL queries
 * @param {{ query: (sql: string, params?: any[]) => Promise<any> }} executor - pool or client
 * @param {any} [log] - logger instance
 * @returns {import('./types.js').TxClient}
 */
export function createRunner(queries, executor, log) {
  /**
   * Look up SQL by name, throw if missing.
   * @param {string} name
   * @returns {string}
   */
  function resolve(name) {
    const sql = queries.get(name);
    if (!sql) {
      throw new PgError(`Query not found: "${name}"`, { queryName: name });
    }
    return sql;
  }

  return {
    /**
     * Execute a named query, return full result.
     * @param {string} name
     * @param {any[]} [params]
     */
    async query(name, params) {
      const sql = resolve(name);
      const start = performance.now();
      try {
        const result = await executor.query(sql, params);
        const ms = (performance.now() - start).toFixed(2);
        log?.debug('query', { name, ms: parseFloat(ms), rows: result.rowCount ?? 0 });
        return result;
      } catch (err) {
        const ms = (performance.now() - start).toFixed(2);
        log?.error('query failed', { name, ms: parseFloat(ms), error: /** @type {Error} */ (err).message });
        throw new PgError(`Query failed: "${name}"`, {
          queryName: name,
          params,
          cause: /** @type {Error} */ (err),
        });
      }
    },

    /**
     * Execute a named query, return first row or null.
     * @param {string} name
     * @param {any[]} [params]
     * @returns {Promise<any | null>}
     */
    async one(name, params) {
      const result = await this.query(name, params);
      return result.rows[0] ?? null;
    },

    /**
     * Execute a named query, return all rows.
     * @param {string} name
     * @param {any[]} [params]
     * @returns {Promise<any[]>}
     */
    async many(name, params) {
      const result = await this.query(name, params);
      return result.rows;
    },

    /**
     * Execute a named query, return rowCount.
     * @param {string} name
     * @param {any[]} [params]
     * @returns {Promise<number>}
     */
    async exec(name, params) {
      const result = await this.query(name, params);
      return result.rowCount ?? 0;
    },

    /**
     * Execute raw SQL (not from file).
     * @param {string} sql
     * @param {any[]} [params]
     */
    async raw(sql, params) {
      const start = performance.now();
      try {
        const result = await executor.query(sql, params);
        const ms = (performance.now() - start).toFixed(2);
        const preview = sql.replace(/\s+/g, ' ').trim().slice(0, 60);
        log?.debug('raw', { sql: preview, ms: parseFloat(ms), rows: result.rowCount ?? 0 });
        return result;
      } catch (err) {
        const ms = (performance.now() - start).toFixed(2);
        log?.error('raw query failed', { ms: parseFloat(ms), error: /** @type {Error} */ (err).message });
        throw new PgError('Raw query failed', {
          cause: /** @type {Error} */ (err),
        });
      }
    },
  };
}

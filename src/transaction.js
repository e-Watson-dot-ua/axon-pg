import { createRunner } from './query.runner.js';

/**
 * Run a function within a database transaction.
 * Auto-commits on success, auto-rollbacks on throw.
 *
 * @param {import('./pool.js').Pool} pool
 * @param {Map<string, string>} queries
 * @param {(tx: import('./types.js').TxClient) => Promise<any>} fn
 * @param {any} [log] - logger instance
 * @returns {Promise<any>}
 */
export async function transaction(pool, queries, fn, log) {
  const client = await pool.checkout();

  try {
    await client.query('BEGIN');
    log?.debug('transaction BEGIN');
    const tx = createRunner(queries, client, log);
    const result = await fn(tx);
    await client.query('COMMIT');
    log?.debug('transaction COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    log?.warn('transaction ROLLBACK', { error: /** @type {Error} */ (err).message });
    throw err;
  } finally {
    client.release();
  }
}

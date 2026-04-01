import { createRunner } from './query.runner.js';

/**
 * Run a function within a database transaction.
 * Auto-commits on success, auto-rollbacks on throw.
 *
 * @param {import('./pool.js').Pool} pool
 * @param {Map<string, string>} queries
 * @param {(tx: import('./types.js').TxClient) => Promise<any>} fn
 * @returns {Promise<any>}
 */
export async function transaction(pool, queries, fn) {
  const client = await pool.checkout();

  try {
    await client.query('BEGIN');
    const tx = createRunner(queries, client);
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

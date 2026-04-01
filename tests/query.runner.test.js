import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner } from '../src/query.runner.js';

/** Mock executor that returns predefined rows. */
function mockExecutor(rows = [], rowCount = rows.length) {
  return {
    async query(_sql, _params) {
      return { rows, rowCount, fields: [] };
    },
  };
}

/** Mock executor that throws. */
function failingExecutor(msg = 'db error') {
  return {
    async query() {
      throw new Error(msg);
    },
  };
}

describe('createRunner', () => {
  const queries = new Map([
    ['users/find.by.id', 'SELECT * FROM users WHERE id = $1'],
    ['users/list.all', 'SELECT * FROM users'],
    ['users/create', 'INSERT INTO users (name) VALUES ($1) RETURNING id'],
  ]);

  it('query() should return full result', async () => {
    const runner = createRunner(queries, mockExecutor([{ id: 1 }]));
    const result = await runner.query('users/find.by.id', [1]);
    assert.deepEqual(result.rows, [{ id: 1 }]);
  });

  it('one() should return first row', async () => {
    const runner = createRunner(queries, mockExecutor([{ id: 1, name: 'Alice' }]));
    const row = await runner.one('users/find.by.id', [1]);
    assert.deepEqual(row, { id: 1, name: 'Alice' });
  });

  it('one() should return null for empty result', async () => {
    const runner = createRunner(queries, mockExecutor([]));
    const row = await runner.one('users/find.by.id', [999]);
    assert.equal(row, null);
  });

  it('many() should return all rows', async () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const runner = createRunner(queries, mockExecutor(rows));
    const result = await runner.many('users/list.all');
    assert.deepEqual(result, rows);
  });

  it('many() should return empty array for no results', async () => {
    const runner = createRunner(queries, mockExecutor([]));
    const result = await runner.many('users/list.all');
    assert.deepEqual(result, []);
  });

  it('exec() should return rowCount', async () => {
    const runner = createRunner(queries, mockExecutor([{ id: 1 }], 1));
    const count = await runner.exec('users/create', ['Bob']);
    assert.equal(count, 1);
  });

  it('raw() should execute arbitrary SQL', async () => {
    const runner = createRunner(queries, mockExecutor([{ now: '2026-01-01' }]));
    const result = await runner.raw('SELECT now()');
    assert.deepEqual(result.rows, [{ now: '2026-01-01' }]);
  });

  it('should throw PgError for unknown query name', async () => {
    const runner = createRunner(queries, mockExecutor());
    await assert.rejects(() => runner.query('nope/missing'), (err) => {
      assert.equal(/** @type {any} */ (err).name, 'PgError');
      assert.ok(err.message.includes('not found'));
      return true;
    });
  });

  it('should throw PgError with context on query failure', async () => {
    const runner = createRunner(queries, failingExecutor('connection lost'));
    await assert.rejects(() => runner.query('users/find.by.id', [1]), (err) => {
      assert.equal(/** @type {any} */ (err).name, 'PgError');
      assert.equal(/** @type {any} */ (err).queryName, 'users/find.by.id');
      assert.deepEqual(/** @type {any} */ (err).params, [1]);
      return true;
    });
  });

  it('should throw PgError on raw query failure', async () => {
    const runner = createRunner(queries, failingExecutor());
    await assert.rejects(() => runner.raw('BAD SQL'), (err) => {
      assert.equal(/** @type {any} */ (err).name, 'PgError');
      return true;
    });
  });
});

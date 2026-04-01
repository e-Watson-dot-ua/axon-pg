import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PgError } from '../src/errors/pg.error.js';

describe('PgError', () => {
  it('should set message, queryName, and params', () => {
    const err = new PgError('query failed', {
      queryName: 'users/find.by.id',
      params: [42],
    });
    assert.equal(err.message, 'query failed');
    assert.equal(err.queryName, 'users/find.by.id');
    assert.deepEqual(err.params, [42]);
    assert.equal(err.name, 'PgError');
  });

  it('should be an instance of Error', () => {
    const err = new PgError('test');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof PgError);
  });

  it('should chain cause', () => {
    const cause = new Error('original');
    const err = new PgError('wrapped', { cause });
    assert.equal(err.cause, cause);
  });

  it('should have a stack trace', () => {
    const err = new PgError('boom');
    assert.ok(err.stack.includes('boom'));
  });
});

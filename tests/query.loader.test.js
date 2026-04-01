import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadQueries, toQueryName } from '../src/query.loader.js';
import { trimQuery } from '../src/utils/sql.utils.js';

describe('toQueryName', () => {
  it('should strip .sql and normalize separators', () => {
    assert.equal(toQueryName('users/find.by.id.sql'), 'users/find.by.id');
  });

  it('should handle top-level files', () => {
    assert.equal(toQueryName('schema.sql'), 'schema');
  });

  it('should handle deeply nested paths', () => {
    assert.equal(toQueryName('a/b/c/deep.query.sql'), 'a/b/c/deep.query');
  });
});

describe('trimQuery', () => {
  it('should trim whitespace and empty lines', () => {
    const sql = '\n  SELECT 1;\n\n';
    assert.equal(trimQuery(sql), 'SELECT 1;');
  });

  it('should preserve internal newlines', () => {
    const sql = 'SELECT id\nFROM users\nWHERE id = $1;';
    assert.equal(trimQuery(sql), sql);
  });

  it('should handle already-clean strings', () => {
    assert.equal(trimQuery('SELECT 1'), 'SELECT 1');
  });
});

describe('loadQueries', () => {
  /** @type {string} */
  let tmpDir;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axon-pg-test-'));

    // Create sql directory structure
    await fs.mkdir(path.join(tmpDir, 'users'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'orders'), { recursive: true });

    await fs.writeFile(
      path.join(tmpDir, 'users', 'find.by.id.sql'),
      'SELECT id, name FROM users WHERE id = $1;',
    );
    await fs.writeFile(
      path.join(tmpDir, 'users', 'list.all.sql'),
      '\n  SELECT * FROM users;\n\n',
    );
    await fs.writeFile(
      path.join(tmpDir, 'orders', 'create.sql'),
      'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING id;',
    );
    await fs.writeFile(
      path.join(tmpDir, 'schema.sql'),
      'CREATE TABLE users (id SERIAL PRIMARY KEY);',
    );

    // Non-sql file should be ignored
    await fs.writeFile(path.join(tmpDir, 'README.md'), '# ignore me');
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should load all .sql files into a map', async () => {
    const queries = await loadQueries(tmpDir);

    assert.equal(queries.size, 4);
    assert.ok(queries.has('users/find.by.id'));
    assert.ok(queries.has('users/list.all'));
    assert.ok(queries.has('orders/create'));
    assert.ok(queries.has('schema'));
  });

  it('should trim loaded SQL content', async () => {
    const queries = await loadQueries(tmpDir);

    assert.equal(queries.get('users/list.all'), 'SELECT * FROM users;');
  });

  it('should preserve query content', async () => {
    const queries = await loadQueries(tmpDir);

    assert.equal(
      queries.get('users/find.by.id'),
      'SELECT id, name FROM users WHERE id = $1;',
    );
  });

  it('should not include non-sql files', async () => {
    const queries = await loadQueries(tmpDir);

    for (const key of queries.keys()) {
      assert.ok(!key.includes('README'), `Unexpected key: ${key}`);
    }
  });

  it('should return empty map for empty directory', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axon-pg-empty-'));
    const queries = await loadQueries(emptyDir);
    assert.equal(queries.size, 0);
    await fs.rm(emptyDir, { recursive: true, force: true });
  });
});

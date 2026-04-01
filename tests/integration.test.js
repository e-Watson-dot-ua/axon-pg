import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDb } from '../src/index.js';
import { migrate } from '../src/migrate.js';

const PG_URL = process.env.PG_TEST_URL;

describe('Integration — database tests', { skip: !PG_URL ? 'PG_TEST_URL not set' : false }, () => {
  /** @type {import('../src/index.js').Db} */
  let db;
  /** @type {string} */
  let sqlDir;
  /** @type {string} */
  let migrateDir;

  before(async () => {
    // Create temp SQL directory
    sqlDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axon-pg-sql-'));
    await fs.mkdir(path.join(sqlDir, 'items'), { recursive: true });

    await fs.writeFile(
      path.join(sqlDir, 'items', 'create.sql'),
      'INSERT INTO _test_items (name) VALUES ($1) RETURNING id, name;',
    );
    await fs.writeFile(
      path.join(sqlDir, 'items', 'find.by.id.sql'),
      'SELECT id, name FROM _test_items WHERE id = $1;',
    );
    await fs.writeFile(
      path.join(sqlDir, 'items', 'list.all.sql'),
      'SELECT id, name FROM _test_items ORDER BY id;',
    );
    await fs.writeFile(
      path.join(sqlDir, 'items', 'delete.by.id.sql'),
      'DELETE FROM _test_items WHERE id = $1;',
    );

    // Create temp migration directory
    migrateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axon-pg-migrate-'));
    await fs.writeFile(
      path.join(migrateDir, '001.create.test.items.sql'),
      'CREATE TABLE IF NOT EXISTS _test_items (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL);',
    );
    await fs.writeFile(
      path.join(migrateDir, '002.add.email.sql'),
      'ALTER TABLE _test_items ADD COLUMN IF NOT EXISTS email VARCHAR(255);',
    );

    db = await createDb({ connection: PG_URL, sqlDir });
  });

  after(async () => {
    if (db) {
      await db.raw('DROP TABLE IF EXISTS _test_items CASCADE');
      await db.raw('DROP TABLE IF EXISTS _test_migrations CASCADE');
      await db.close();
    }
    if (sqlDir) await fs.rm(sqlDir, { recursive: true, force: true });
    if (migrateDir) await fs.rm(migrateDir, { recursive: true, force: true });
  });

  it('should ping the database', async () => {
    assert.equal(await db.ping(), true);
  });

  it('should execute raw SQL', async () => {
    const result = await db.raw('SELECT 1 + 1 AS sum');
    assert.equal(result.rows[0].sum, 2);
  });

  it('should run migrations', async () => {
    const ran = await migrate(db, { dir: migrateDir, table: '_test_migrations' });
    assert.equal(ran.length, 2);
    assert.equal(ran[0], '001.create.test.items');
    assert.equal(ran[1], '002.add.email');

    // Running again should apply nothing
    const ran2 = await migrate(db, { dir: migrateDir, table: '_test_migrations' });
    assert.equal(ran2.length, 0);
  });

  it('should insert and query via named queries', async () => {
    const result = await db.one('items/create', ['Widget']);
    assert.ok(result.id);
    assert.equal(result.name, 'Widget');

    const found = await db.one('items/find.by.id', [result.id]);
    assert.equal(found.name, 'Widget');
  });

  it('should list all rows', async () => {
    await db.one('items/create', ['Gadget']);
    const items = await db.many('items/list.all');
    assert.ok(items.length >= 2);
  });

  it('should return rowCount from exec', async () => {
    const created = await db.one('items/create', ['Temp']);
    const count = await db.exec('items/delete.by.id', [created.id]);
    assert.equal(count, 1);
  });

  it('should commit transactions', async () => {
    const result = await db.transaction(async (tx) => {
      const item = await tx.one('items/create', ['TxItem']);
      return item;
    });
    assert.equal(result.name, 'TxItem');

    const found = await db.one('items/find.by.id', [result.id]);
    assert.equal(found.name, 'TxItem');
  });

  it('should rollback transactions on error', async () => {
    const beforeCount = (await db.many('items/list.all')).length;

    await assert.rejects(async () => {
      await db.transaction(async (tx) => {
        await tx.one('items/create', ['WillRollback']);
        throw new Error('rollback!');
      });
    }, { message: 'rollback!' });

    const afterCount = (await db.many('items/list.all')).length;
    assert.equal(afterCount, beforeCount);
  });

  it('should throw PgError for unknown query', async () => {
    await assert.rejects(() => db.query('nope/missing'), (err) => {
      assert.equal(/** @type {any} */ (err).name, 'PgError');
      return true;
    });
  });
});

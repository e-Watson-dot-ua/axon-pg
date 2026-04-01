# axon-pg — Development Plan

Each step is an atomic, testable unit of work. Steps are grouped into phases.
Complete each step before moving to the next. Every step that produces code
must include at least one test (using the Node.js built-in test runner).

**Cross-platform rule:** All code, scripts, tests, and file operations must
work identically on Windows, Linux, and macOS. Use `node:path.join()` for
all paths. Use `node:fs/promises` for all file I/O.

**Testing note:** Database tests require a running PostgreSQL instance.
Use environment variable `PG_TEST_URL` for the connection string.
Tests that need a database should skip gracefully when unavailable.

---

## Phase 0 — Project Scaffolding

### 0.1 Initialize package.json
- `@e-watson/axon-pg`, ESM, `node >= 18`
- Peer deps: `pg`, `@e-watson/axon` (optional)
- Dev deps: `eslint`, `prettier`, `@types/node`, `pg` (for testing)
- Scripts: `test`, `lint`, `format`

### 0.2 Copy config files from axon
- `.editorconfig`, `.prettierrc`, `.gitignore`, `eslint.config.js`
- Adapt as needed (same style conventions)

### 0.3 Configure test runner
- `"test": "node --test \"tests/**/*.test.js\""`
- Create `tests/__smoke__.test.js`

### 0.4 Create directory structure
- All directories from project structure in idea.md
- Create `jsconfig.json` with `checkJs: true`
- Create `src/types.js` with shared JSDoc typedefs

---

## Phase 1 — SQL File Loader

### 1.1 Implement query loader — file discovery
- File: `src/query.loader.js`
- `loadQueries(dir)` — recursively find all `.sql` files
- Use `node:fs/promises.readdir` with `{ recursive: true }`
- Return `Map<string, string>` (name → SQL content)
- Test: create temp dir with `.sql` files, verify map keys and values

### 1.2 Implement query name derivation
- Strip base dir, strip `.sql` extension, normalize to forward slashes
- `sql/users/find.by.id.sql` → `users/find.by.id`
- Test: various paths, nested dirs, edge cases

### 1.3 Implement SQL utilities
- File: `src/utils/sql.utils.js`
- `trimQuery(sql)` — trim whitespace, collapse blank lines
- Test: multiline SQL with comments and whitespace

---

## Phase 2 — Connection Pool

### 2.1 Implement pool wrapper
- File: `src/pool.js`
- Constructor receives connection string or `pg.PoolConfig`
- `connect()` — creates `pg.Pool`, verifies with `SELECT 1`
- `close()` — calls `pool.end()`
- `ping()` — runs `SELECT 1`
- Test: connect to test database, ping, close
  (skip if `PG_TEST_URL` not set)

### 2.2 Implement PgError
- File: `src/errors/pg.error.js`
- Wraps `pg` errors with query name and params for debugging
- Test: construct, verify properties

---

## Phase 3 — Query Runner

### 3.1 Implement `query(name, params)`
- File: `src/query.runner.js`
- Look up SQL from loaded queries map
- Execute via `pool.query(sql, params)`
- Throw `PgError` with query name on failure
- Test: run a loaded query against test DB

### 3.2 Implement `one(name, params)`
- Return `rows[0]` or `null`
- Test: query returning one row, query returning none

### 3.3 Implement `many(name, params)`
- Return `rows` array
- Test: query returning multiple rows, empty result

### 3.4 Implement `exec(name, params)`
- Return `rowCount`
- Test: INSERT, verify count

### 3.5 Implement `raw(sql, params)`
- Execute arbitrary SQL (not from file)
- Test: raw SELECT

---

## Phase 4 — Transactions

### 4.1 Implement transaction helper
- File: `src/transaction.js`
- `transaction(pool, queryMap, fn)` — checkout client, BEGIN,
  run `fn(tx)`, COMMIT on success, ROLLBACK on throw
- `tx` has same API: `query`, `one`, `many`, `exec`, `raw`
- Test: successful transaction commits; throwing rolls back

### 4.2 Wire transaction into Db class
- `db.transaction(async (tx) => { ... })`
- Test: use from Db instance

---

## Phase 5 — Db Facade (createDb)

### 5.1 Implement Db class
- File: `src/index.js`
- `createDb(opts)` — factory that:
  1. Loads SQL files from `opts.sqlDir`
  2. Creates pool from `opts.connection` + `opts.pool`
  3. Returns `Db` instance with: `query`, `one`, `many`, `exec`,
     `raw`, `transaction`, `close`, `ping`
- Test: full lifecycle — create, query, close

---

## Phase 6 — Axon Plugin

### 6.1 Implement `axonPg` plugin
- File: `src/plugin.js`
- Receives `(app, opts)` via `app.register(axonPg, opts)`
- Creates `Db` instance, decorates `app.db` and `ctx.db`
- Registers shutdown hook (if Axon supports it) or documents
  that user should call `app.db.close()` on shutdown
- Test: register plugin, verify `ctx.db` works in handler

---

## Phase 7 — Migration Runner

### 7.1 Implement migration tracker
- File: `src/migrate.js`
- Create `_migrations` table if not exists
- Track: `id`, `name`, `applied_at`
- Test: create tracker table, verify schema

### 7.2 Implement migration runner
- Discover `.sql` files in migration dir, sort by name
- Compare against applied migrations
- Run pending in order, within a transaction
- Test: run 2 migrations, verify both applied;
  run again, verify no duplicates

---

## Phase 8 — Integration & Polish

### 8.1 End-to-end integration test
- Create DB, load queries, run CRUD operations, transactions,
  verify results, close

### 8.2 Finalize public API exports
- File: `src/index.js` — `createDb`, `axonPg`, `migrate`, `PgError`
- Verify all exports

### 8.3 Write README.md
- Quick start (standalone + Axon plugin)
- SQL file conventions
- API reference
- Migration usage

### 8.4 Review & cleanup
- Remove placeholder files
- Verify all tests pass
- Verify lint passes
- Final JSDoc review

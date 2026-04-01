# axon-pg

PostgreSQL toolkit for the Axon family — SQL file loader, pool, query runner, transactions, migrations.

## Project overview

- **Package**: `@e-watson/axon-pg`
- **Runtime**: Node.js >= 18, ESM-only
- **Peer deps**: `pg` (required), `@e-watson/axon` (optional), `@e-watson/axon-logger` (optional)
- **No TypeScript** — plain JS with JSDoc types (`jsconfig.json` has `checkJs: true`)

## Architecture

- `src/index.js` — `Db` class and `createDb()` factory (main entry point)
- `src/pool.js` — `pg.Pool` wrapper with `connect()`, `ping()`, `close()`
- `src/query.loader.js` — recursively loads `.sql` files into `Map<name, sql>`
- `src/query.runner.js` — `createRunner()` bound to query map + executor
- `src/transaction.js` — `BEGIN`/`COMMIT`/`ROLLBACK` with same runner API
- `src/plugin.js` — `axonPg` Axon plugin: decorates `app.db` and `ctx.db`
- `src/migrate.js` — migration runner: numbered `.sql` files tracked in DB
- `src/errors/pg.error.js` — `PgError` with query name, params, cause chain
- `src/utils/sql.utils.js` — SQL string helpers (trim)
- `src/utils/logger.utils.js` — resolves @e-watson/axon-logger or noop fallback

## Logging

Logger is threaded through pool, query runner, transactions, and migrations.
- `debug` level: logs every query (name, elapsed ms, row count), BEGIN/COMMIT/ROLLBACK
- `info` level: logs connect, close, migration applied, query count loaded
- `warn` level: logs ROLLBACK, ping failures
- `error` level: logs query failures, connection failures
- Without `@e-watson/axon-logger`: all logging is silently skipped (noop)
- Pass custom logger via `createDb({ logger })` or let the plugin inherit `app.log`

## How SQL files work

```
sql/users/find.by.id.sql  →  db.one('users/find.by.id', [42])
sql/orders/create.sql      →  db.exec('orders/create', [userId, 'pending'])
```

Loader reads all `.sql` files at startup, caches by relative path minus `.sql` extension.

## Commands

- `npm test` — run all tests (Node.js built-in test runner)
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Testing

- Unit tests use mock executors (no database needed)
- Integration tests require `PG_TEST_URL` environment variable
- Tests skip gracefully when `PG_TEST_URL` is not set
- Example: `PG_TEST_URL=postgresql://user:pass@localhost:5432/testdb npm test`

## Conventions

- File naming: dot-separated (e.g., `query.loader.js`, `pg.error.js`, `sql.utils.js`)
- Tests live in `tests/` directory
- Test files: `*.test.js`
- All file paths use `node:path.join()` / `node:path.resolve()` (cross-platform)
- Prettier: single quotes, trailing commas, 100 char width, 2-space indent
- ESLint: `no-unused-vars` (with `_` prefix ignore), `no-console` warning

## Relation to Axon core

- Independent package and repo
- Plugin integration via `app.register(axonPg, opts)` (optional)
- Follows same conventions as `@e-watson/axon`

## Design docs

- `docs/idea.md` — full architecture and design patterns
- `docs/dev.plan.md` — development plan (Phases 0–8)

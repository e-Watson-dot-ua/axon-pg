# axon-pg — PostgreSQL Toolkit for the Axon Family

## Vision

A standalone PostgreSQL utility package that loads SQL from `.sql` files,
manages connection pools via `pg`, and optionally integrates with the Axon
HTTP framework as a plugin. No ORM, no query builder — just raw SQL with
clean ergonomics.

## Constraints

- **`pg` is a peer dependency** — the user installs it, we don't bundle it
- **ESM-only** — matches `@e-watson/axon` conventions
- **Node.js >= 18** — same baseline as Axon core
- **Zero runtime dependencies** beyond `pg` — no ORMs, no query builders
- **Cross-platform** — works on Windows, Linux, macOS
  - Use `node:path.join()` / `node:path.resolve()` for all file paths
  - Use `node:fs/promises` for all file I/O

## Core Concepts

### 1. SQL File Loader

SQL files live in a user-defined directory, organized by domain:

```
sql/
  users/
    find.by.id.sql
    create.sql
    list.all.sql
  orders/
    find.by.user.sql
    create.sql
```

Each `.sql` file contains a single query:

```sql
-- sql/users/find.by.id.sql
SELECT id, name, email
FROM users
WHERE id = $1;
```

The loader reads all `.sql` files at startup, caches them in a
`Map<string, string>` keyed by relative path without extension:

```
sql/users/find.by.id.sql  →  'users/find.by.id'
sql/orders/create.sql      →  'orders/create'
```

File naming convention: dot-separated, matching Axon's style.

### 2. Connection Pool

Wraps `pg.Pool` with:

- Config from connection string or object
- Pool lifecycle: `connect()`, `close()`
- Health check: `ping()` (runs `SELECT 1`)
- Pool event forwarding (error, connect, acquire, remove)

### 3. Query Runner

Execute loaded SQL queries by name:

```js
const user = await db.query('users/find.by.id', [42]);
// Returns pg.QueryResult — { rows, rowCount, fields, ... }
```

Convenience methods:

```js
// Single row or null
const user = await db.one('users/find.by.id', [42]);

// All rows
const users = await db.many('users/list.all');

// Execute (INSERT/UPDATE/DELETE), return rowCount
const count = await db.exec('users/delete.by.id', [42]);

// Raw SQL (not from file)
const result = await db.raw('SELECT now()');
```

### 4. Transactions

```js
await db.transaction(async (tx) => {
  const user = await tx.one('users/create', ['Alice', 'alice@example.com']);
  await tx.exec('orders/create', [user.id, 'pending']);
  // Auto-commits on success, auto-rollbacks on throw
});
```

The `tx` object has the same API as `db` (query, one, many, exec, raw)
but runs on a dedicated client from the pool.

### 5. Axon Plugin Integration

```js
import { createApp } from '@e-watson/axon';
import { axonPg } from '@e-watson/axon-pg';

const app = createApp();

app.register(axonPg, {
  connection: 'postgresql://user:pass@localhost:5432/mydb',
  sqlDir: './sql',
  pool: { max: 20, idleTimeoutMillis: 30000 },
});

// ctx.db is available in every handler
app.get('/users/:id', async (ctx) => {
  const user = await ctx.db.one('users/find.by.id', [ctx.params.id]);
  if (!user) throw new HttpError(404, 'User not found');
  ctx.send(user);
});
```

The plugin:
- Calls `app.decorate('db', db)` — available as `app.db`
- Calls `app.decorateCtx('db', db)` — available as `ctx.db`
- Registers a graceful shutdown hook to close the pool

### 6. Standalone Usage (No Axon)

```js
import { createDb } from '@e-watson/axon-pg';

const db = await createDb({
  connection: 'postgresql://user:pass@localhost:5432/mydb',
  sqlDir: './sql',
});

const users = await db.many('users/list.all');
await db.close();
```

### 7. Migration Runner (Optional)

Simple numbered migration files:

```
migrations/
  001.create.users.sql
  002.create.orders.sql
  003.add.email.index.sql
```

```js
import { migrate } from '@e-watson/axon-pg/migrate';

await migrate(db, { dir: './migrations' });
// Tracks applied migrations in a `_migrations` table
// Runs pending migrations in order
```

## Project Structure

```
src/
  index.js                -- public API: createDb, axonPg
  pool.js                 -- pg.Pool wrapper
  query.loader.js         -- .sql file discovery and caching
  query.runner.js         -- query execution (query, one, many, exec, raw)
  transaction.js          -- transaction helper
  plugin.js               -- Axon plugin (app.register integration)
  migrate.js              -- migration runner
  errors/
    pg.error.js           -- wrapped database errors
  utils/
    sql.utils.js          -- SQL string helpers (trim, comment strip)
tests/
  ...
sql/                      -- example SQL files for tests
  ...
```

## Public API Surface

```js
// Main entry
export { createDb } from './src/index.js';     // Standalone factory
export { axonPg } from './src/plugin.js';       // Axon plugin

// Optional
export { migrate } from './src/migrate.js';     // Migration runner
export { PgError } from './src/errors/pg.error.js';
```

## Design Patterns

| Pattern         | Where                                          |
|-----------------|------------------------------------------------|
| **Factory**     | `createDb()` entry point                       |
| **Repository**  | SQL files organized by domain (users/, orders/) |
| **Decorator**   | Axon plugin: `decorate('db')`, `decorateCtx('db')` |
| **Unit of Work**| `db.transaction()` — commit/rollback scope     |
| **Registry**    | Query loader caches SQL strings by name        |

## Relation to Axon Core

- **Peer dependency** on `@e-watson/axon` (optional — only needed for plugin)
- **Peer dependency** on `pg` (required)
- Independent release cycle, independent repo (`axon-pg`)
- Follows same conventions: ESM, dot-separated files, JSDoc types,
  Node.js built-in test runner, same eslint/prettier config

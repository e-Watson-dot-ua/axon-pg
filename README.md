# axon-pg

PostgreSQL toolkit for the Axon family — SQL file loader, connection pool,
query runner, transactions, and migrations. Zero runtime dependencies beyond `pg`.

## Features

- **SQL files as queries** — write SQL in `.sql` files, reference by name
- **Connection pool** — `pg.Pool` wrapper with health check and lifecycle
- **Query runner** — `query`, `one`, `many`, `exec`, `raw` methods
- **Transactions** — `db.transaction(async (tx) => { ... })` with auto-commit/rollback
- **Migration runner** — numbered `.sql` files, tracked in database
- **Axon plugin** — `app.register(axonPg, opts)` for seamless integration
- **Standalone** — works without Axon, just needs `pg`

## Requirements

- Node.js >= 18.0.0
- PostgreSQL >= 12
- `pg` >= 8.0.0

## Install

```bash
npm install @e-watson/axon-pg pg
```

## Quick Start — Standalone

```
sql/
  users/
    find.by.id.sql
    create.sql
    list.all.sql
```

```sql
-- sql/users/find.by.id.sql
SELECT id, name, email
FROM users
WHERE id = $1;
```

```js
import { createDb } from '@e-watson/axon-pg';

const db = await createDb({
  connection: 'postgresql://user:pass@localhost:5432/mydb',
  sqlDir: './sql',
});

// Named queries
const user = await db.one('users/find.by.id', [42]);
const users = await db.many('users/list.all');
const count = await db.exec('users/create', ['Alice', 'alice@example.com']);

// Raw SQL
const result = await db.raw('SELECT now()');

// Transactions
await db.transaction(async (tx) => {
  const user = await tx.one('users/create', ['Bob', 'bob@example.com']);
  await tx.exec('orders/create', [user.id, 'pending']);
});

await db.close();
```

## Quick Start — With Axon

```js
import { createApp } from '@e-watson/axon';
import { axonPg } from '@e-watson/axon-pg';

const app = createApp();

app.register(axonPg, {
  connection: 'postgresql://user:pass@localhost:5432/mydb',
  sqlDir: './sql',
  pool: { max: 20 },
});

app.get('/users/:id', async (ctx) => {
  const user = await ctx.db.one('users/find.by.id', [ctx.params.id]);
  ctx.send(user ?? { error: 'Not found' });
});

app.listen({ port: 3000 });
```

## Migrations

```
migrations/
  001.create.users.sql
  002.create.orders.sql
  003.add.email.index.sql
```

```js
import { createDb } from '@e-watson/axon-pg';
import { migrate } from '@e-watson/axon-pg/migrate';

const db = await createDb({ connection: '...', sqlDir: './sql' });

const applied = await migrate(db, { dir: './migrations' });
console.log('Applied:', applied);

await db.close();
```

Migrations are tracked in a `_migrations` table (configurable via `table` option).
Each migration runs in a transaction. Already-applied migrations are skipped.

## API

### `createDb(opts)`

Create a new database instance.

| Option | Type | Description |
|--------|------|-------------|
| `connection` | `string` | PostgreSQL connection string |
| `sqlDir` | `string` | Path to SQL files directory |
| `pool.max` | `number` | Max pool size (default: 10) |
| `pool.idleTimeoutMillis` | `number` | Idle timeout (default: 30000) |

### `db` methods

| Method | Returns | Description |
|--------|---------|-------------|
| `db.query(name, params?)` | `QueryResult` | Full result with rows, rowCount, fields |
| `db.one(name, params?)` | `row \| null` | First row or null |
| `db.many(name, params?)` | `row[]` | All rows |
| `db.exec(name, params?)` | `number` | Row count (for INSERT/UPDATE/DELETE) |
| `db.raw(sql, params?)` | `QueryResult` | Execute arbitrary SQL |
| `db.transaction(fn)` | `any` | Run function in transaction |
| `db.ping()` | `boolean` | Health check |
| `db.close()` | `void` | Close pool |

### `migrate(db, opts)`

| Option | Type | Description |
|--------|------|-------------|
| `dir` | `string` | Path to migrations directory |
| `table` | `string` | Tracking table name (default: `_migrations`) |

Returns `string[]` — names of applied migrations.

## SQL File Conventions

- Files must have `.sql` extension
- One query per file
- Use `$1`, `$2`, ... for parameters (PostgreSQL syntax)
- Organized by domain: `users/`, `orders/`, etc.
- Name → file mapping: `users/find.by.id` → `sql/users/find.by.id.sql`

## License

[MIT](LICENSE)

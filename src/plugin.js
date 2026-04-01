import { createDb } from './index.js';

/**
 * Axon plugin for PostgreSQL integration.
 * Registers `app.db` and `ctx.db` with a Db instance.
 *
 * @param {any} app - Axon app instance
 * @param {import('./types.js').DbOptions} opts
 */
export async function axonPg(app, opts) {
  const db = await createDb(opts);

  app.decorate('db', db);
  app.decorateCtx('db', db);

  // Register shutdown hook if available
  if (typeof app.addHook === 'function') {
    const origClose = app.close?.bind(app);
    if (origClose) {
      app.close = async function (...args) {
        await db.close();
        return origClose(...args);
      };
    }
  }
}

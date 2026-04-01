/**
 * Wrapped database error with query context for debugging.
 */
export class PgError extends Error {
  /**
   * @param {string} message
   * @param {Object} [context]
   * @param {string} [context.queryName]
   * @param {any[]} [context.params]
   * @param {Error} [context.cause]
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'PgError';
    this.queryName = context.queryName;
    this.params = context.params;
    if (context.cause) this.cause = context.cause;
  }
}

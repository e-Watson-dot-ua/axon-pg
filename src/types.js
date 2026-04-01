/**
 * Shared type definitions for axon-pg.
 */

/**
 * @typedef {Object} DbOptions
 * @property {string} connection - PostgreSQL connection string
 * @property {string} sqlDir - path to SQL files directory
 * @property {Object} [pool] - pg.PoolConfig overrides
 * @property {number} [pool.max] - max pool size (default: 10)
 * @property {number} [pool.idleTimeoutMillis] - idle timeout (default: 30000)
 * @property {number} [pool.connectionTimeoutMillis] - connect timeout (default: 5000)
 */

/**
 * @typedef {Object} QueryResult
 * @property {any[]} rows
 * @property {number} rowCount
 * @property {any[]} fields
 */

/**
 * @typedef {Object} TxClient
 * @property {(name: string, params?: any[]) => Promise<QueryResult>} query
 * @property {(name: string, params?: any[]) => Promise<any | null>} one
 * @property {(name: string, params?: any[]) => Promise<any[]>} many
 * @property {(name: string, params?: any[]) => Promise<number>} exec
 * @property {(sql: string, params?: any[]) => Promise<QueryResult>} raw
 */

/**
 * @typedef {Object} MigrateOptions
 * @property {string} dir - path to migrations directory
 * @property {string} [table] - migrations table name (default: '_migrations')
 */

export {};

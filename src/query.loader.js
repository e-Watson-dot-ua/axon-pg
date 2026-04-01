import fs from 'node:fs/promises';
import path from 'node:path';
import { trimQuery } from './utils/sql.utils.js';

/**
 * Recursively load all .sql files from a directory into a Map.
 * Keys are derived from the relative path: `users/find.by.id.sql` → `users/find.by.id`
 *
 * @param {string} dir - absolute or relative path to SQL directory
 * @returns {Promise<Map<string, string>>}
 */
export async function loadQueries(dir) {
  const root = path.resolve(dir);
  /** @type {Map<string, string>} */
  const queries = new Map();

  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.sql')) continue;

    const fullPath = path.join(entry.parentPath ?? entry.path, entry.name);
    const relativePath = path.relative(root, fullPath);
    const name = toQueryName(relativePath);
    const content = await fs.readFile(fullPath, 'utf8');

    queries.set(name, trimQuery(content));
  }

  return queries;
}

/**
 * Derive a query name from a relative file path.
 * Strips .sql extension, normalizes separators to forward slashes.
 *
 * @param {string} relativePath
 * @returns {string}
 */
export function toQueryName(relativePath) {
  return relativePath
    .replace(/\.sql$/, '')
    .split(path.sep)
    .join('/');
}

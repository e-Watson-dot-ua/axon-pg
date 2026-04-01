/**
 * Trim a SQL string: collapse leading/trailing whitespace,
 * remove empty lines at start/end.
 *
 * @param {string} sql
 * @returns {string}
 */
export function trimQuery(sql) {
  return sql.replace(/^\s*\n/, '').replace(/\n\s*$/, '').trim();
}

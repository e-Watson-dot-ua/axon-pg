/**
 * Minimal noop logger fallback when @e-watson/axon-logger is not installed.
 * Same interface — just does nothing.
 */
class NoopLogger {
  child() { return this; }
  fatal() {}
  error() {}
  warn() {}
  info() {}
  debug() {}
  trace() {}
  time() {}
  timeEnd() {}
}

const noop = new NoopLogger();

/** @type {any} */
let LoggerClass = null;

/**
 * Resolve the logger: try @e-watson/axon-logger, fall back to noop.
 *
 * @param {Object} [opts]
 * @param {'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'} [opts.level]
 * @returns {Promise<any>}
 */
export async function resolveLogger(opts) {
  if (!LoggerClass) {
    try {
      const mod = await import('@e-watson/axon-logger');
      if (mod.Logger) LoggerClass = mod.Logger;
    } catch {
      // not installed
    }
  }

  if (LoggerClass) {
    return new LoggerClass(opts);
  }

  return noop;
}

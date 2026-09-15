const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();
const SERVICE_NAME = 'orders-api';

function formatLog(level, msg, meta = {}, bindings = {}) {
  const store = asyncLocalStorage.getStore() || {};

  const entry = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    msg: typeof msg === 'string' ? msg : JSON.stringify(msg),
    ...store,
    ...bindings,
    ...meta,
  };

  if (entry.err && entry.err instanceof Error) {
    entry.error = entry.err.message;
    delete entry.err;
  }

  return JSON.stringify(entry);
}

function createLogger(bindings = {}) {
  return {
    info: (msg, meta = {}) => {
      console.log(formatLog('info', msg, meta, bindings));
    },
    warn: (msg, meta = {}) => {
      console.log(formatLog('warn', msg, meta, bindings));
    },
    error: (msg, meta = {}) => {
      console.log(formatLog('error', msg, meta, bindings));
    },
    debug: (msg, meta = {}) => {
      console.log(formatLog('debug', msg, meta, bindings));
    },
    child: (extraBindings = {}) => createLogger({ ...bindings, ...extraBindings }),
  };
}

const logger = {
  ...createLogger(),
  asyncLocalStorage,
};

module.exports = logger;

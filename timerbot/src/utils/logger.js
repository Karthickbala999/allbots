'use strict';

require('dotenv').config();

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',   // Cyan
  info:  '\x1b[32m',   // Green
  warn:  '\x1b[33m',   // Yellow
  error: '\x1b[31m',   // Red
  time:  '\x1b[90m',   // Grey
  bold:  '\x1b[1m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, ...args) {
  if (LEVELS[level] < LOG_LEVEL) return;
  const c = COLORS[level] || '';
  const prefix = `${COLORS.time}[${timestamp()}]${COLORS.reset} ${c}${COLORS.bold}[${level.toUpperCase()}]${COLORS.reset}`;
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](prefix, ...args);
}

const logger = {
  debug: (...a) => log('debug', ...a),
  info:  (...a) => log('info',  ...a),
  warn:  (...a) => log('warn',  ...a),
  error: (...a) => log('error', ...a),
};

module.exports = logger;

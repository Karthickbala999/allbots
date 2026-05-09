'use strict';

const moment = require('moment-timezone');

const SUPPORTED_TIMEZONES = moment.tz.names();

/**
 * Validate that a timezone string is recognized by moment-timezone.
 * @param {string} tz
 * @returns {boolean}
 */
function isValidTimezone(tz) {
  return SUPPORTED_TIMEZONES.includes(tz);
}

/**
 * Parse a time string "HH:MM" and date string "YYYY-MM-DD" into a moment in the given timezone.
 * @param {string} timeStr  "HH:MM"
 * @param {string} dateStr  "YYYY-MM-DD"
 * @param {string} tz
 * @returns {moment.Moment}
 */
function parseDatetime(timeStr, dateStr, tz) {
  return moment.tz(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', tz);
}

/**
 * Returns true if `start` is before `end`.
 */
function isStartBeforeEnd(startStr, endStr, dateStr, tz) {
  const start = parseDatetime(startStr, dateStr, tz);
  const end   = parseDatetime(endStr,   dateStr, tz);
  return start.isBefore(end);
}

/**
 * Returns current moment in a given timezone.
 */
function nowInTz(tz) {
  return moment().tz(tz);
}

/**
 * Format a time string with a timezone for display.
 */
function formatDisplay(timeStr, dateStr, tz) {
  return parseDatetime(timeStr, dateStr, tz).format('ddd, MMM D YYYY  HH:mm z');
}

/**
 * Validate that a date string is YYYY-MM-DD.
 */
function isValidDate(dateStr) {
  return moment(dateStr, 'YYYY-MM-DD', true).isValid();
}

/**
 * Validate that a time string is HH:MM (24h).
 */
function isValidTime(timeStr) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

/**
 * Autocomplete list of common timezones (filtered by query).
 */
function filterTimezones(query) {
  const q = query.toLowerCase();
  return SUPPORTED_TIMEZONES
    .filter((tz) => tz.toLowerCase().includes(q))
    .slice(0, 25)
    .map((tz) => ({ name: tz, value: tz }));
}

module.exports = {
  isValidTimezone,
  parseDatetime,
  isStartBeforeEnd,
  nowInTz,
  formatDisplay,
  isValidDate,
  isValidTime,
  filterTimezones,
};

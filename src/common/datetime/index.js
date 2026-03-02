import {
  isValid,
  parseISO,
  format as dateFnsFormat,
  addDays,
  subDays,
  addMinutes,
  subMinutes,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseJSON
} from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

/**
 * Converts moment-style format tokens to date-fns format tokens.
 * Handles only the tokens present in this codebase.
 * Moment → date-fns: YYYY→yyyy, DD→dd, YY→yy, D→d
 *
 * @param {string} momentFormat
 * @returns {string}
 */
export function toDateFnsToken(momentFormat) {
  return momentFormat
    .replace(/YYYY/g, 'yyyy')
    .replace(/DD/g, 'dd')
    .replace(/YY/g, 'yy')
    .replace(/\bD\b/g, 'd')
}

/**
 * Returns whether the given value is a valid date.
 * Accepts ISO strings, Date instances, or timestamps.
 *
 * @param {string | Date | number} value
 * @returns {boolean}
 */
export function isValidDate(value) {
  if (value instanceof Date) return isValid(value)
  if (typeof value === 'string') return isValid(parseISO(value))
  if (typeof value === 'number') return isValid(new Date(value))
  return false
}

/**
 * Formats a date using a moment-compatible format string.
 * Uses the local system timezone.
 *
 * @param {Date | string | number} date
 * @param {string} momentFormat
 * @returns {string}
 */
export function formatDate(date, momentFormat) {
  const parsed = date instanceof Date ? date : parseJSON(date)
  return dateFnsFormat(parsed, toDateFnsToken(momentFormat))
}

/**
 * Formats a date in the given IANA timezone using a moment-compatible format string.
 * Equivalent to moment(date).tz(timezone).format(momentFormat).
 *
 * Timezone behavior: converts the UTC instant to the target timezone wall-clock time.
 * No keepLocalTime semantics. If you need keepLocalTime, use convertTimezone().
 *
 * @param {Date | string | number} date
 * @param {string} timezone  IANA timezone string, e.g. 'Europe/Madrid'
 * @param {string} momentFormat
 * @returns {string}
 */
export function formatTz(date, timezone, momentFormat) {
  const parsed = date instanceof Date ? date : parseJSON(date)
  return formatInTimeZone(parsed, timezone, toDateFnsToken(momentFormat))
}

/**
 * Converts a date to its wall-clock representation in the target timezone,
 * then formats it. Equivalent to moment(date).tz(timezone, false).format(momentFormat).
 *
 * Timezone change: the UTC instant is reinterpreted as local time in `timezone`.
 * Wall-clock time changes; the underlying UTC instant is preserved.
 *
 * @param {Date | string | number} date
 * @param {string} timezone  IANA timezone string
 * @param {string} momentFormat
 * @returns {string}
 */
export function convertTimezone(date, timezone, momentFormat) {
  const parsed = date instanceof Date ? date : parseJSON(date)
  const zoned = toZonedTime(parsed, timezone)
  return dateFnsFormat(zoned, toDateFnsToken(momentFormat))
}

/**
 * Returns the current UTC instant formatted with the given moment-compatible format string.
 * Equivalent to moment().utc().format(momentFormat).
 *
 * @param {string} momentFormat
 * @returns {string}
 */
export function nowUtc(momentFormat) {
  return dateFnsFormat(new Date(), toDateFnsToken(momentFormat))
}

/**
 * Returns the current instant in the given IANA timezone, formatted with a
 * moment-compatible format string.
 * Equivalent to moment().tz(timezone).format(momentFormat).
 *
 * @param {string} timezone  IANA timezone string
 * @param {string} momentFormat
 * @returns {string}
 */
export function nowTz(timezone, momentFormat) {
  return formatInTimeZone(new Date(), timezone, toDateFnsToken(momentFormat))
}

/**
 * Adds days to a date and formats the result using a moment-compatible format string.
 * Equivalent to moment(date).add(n, 'days').format(momentFormat).
 *
 * @param {Date | string | number} date
 * @param {number} n
 * @param {string} momentFormat
 * @returns {string}
 */
export function addDaysFormatted(date, n, momentFormat) {
  const parsed = date instanceof Date ? date : parseJSON(date)
  return dateFnsFormat(addDays(parsed, n), toDateFnsToken(momentFormat))
}

/**
 * Subtracts days from a date and formats the result using a moment-compatible format string.
 * Equivalent to moment(date).subtract(n, 'days').format(momentFormat).
 *
 * @param {Date | string | number} date
 * @param {number} n
 * @param {string} momentFormat
 * @returns {string}
 */
export function subDaysFormatted(date, n, momentFormat) {
  const parsed = date instanceof Date ? date : parseJSON(date)
  return dateFnsFormat(subDays(parsed, n), toDateFnsToken(momentFormat))
}

/**
 * Subtracts minutes from a date and formats the result using a moment-compatible format string.
 * Equivalent to moment(date).subtract(n, 'minutes').format(momentFormat).
 *
 * @param {Date | string | number} date
 * @param {number} n
 * @param {string} momentFormat
 * @returns {string}
 */
export function subMinutesFormatted(date, n, momentFormat) {
  const parsed = date instanceof Date ? date : parseJSON(date)
  return dateFnsFormat(subMinutes(parsed, n), toDateFnsToken(momentFormat))
}

/**
 * Adds minutes to a date and formats the result using a moment-compatible format string.
 * Equivalent to moment(date).add(n, 'minutes').format(momentFormat).
 *
 * @param {Date | string | number} date
 * @param {number} n
 * @param {string} momentFormat
 * @returns {string}
 */
export function addMinutesFormatted(date, n, momentFormat) {
  const parsed = date instanceof Date ? date : parseJSON(date)
  return dateFnsFormat(addMinutes(parsed, n), toDateFnsToken(momentFormat))
}

/**
 * Returns the start of the UTC day for the current instant, formatted with a
 * moment-compatible format string.
 * Equivalent to moment().utc().startOf('day').format(momentFormat).
 *
 * @param {string} momentFormat
 * @returns {string}
 */
export function startOfUtcDay(momentFormat) {
  return dateFnsFormat(startOfDay(new Date()), toDateFnsToken(momentFormat))
}

/**
 * Returns the end of the UTC day for the current instant, formatted with a
 * moment-compatible format string.
 * Equivalent to moment().utc().endOf('day').format(momentFormat).
 *
 * @param {string} momentFormat
 * @returns {string}
 */
export function endOfUtcDay(momentFormat) {
  return dateFnsFormat(endOfDay(new Date()), toDateFnsToken(momentFormat))
}

/**
 * Returns whether `date` falls within the interval [start, end] (both inclusive).
 * Equivalent to moment(date).utc().isBetween(start, end).
 *
 * @param {Date | string | number} date
 * @param {Date | string | number} start
 * @param {Date | string | number} end
 * @returns {boolean}
 */
export function isBetween(date, start, end) {
  const toDate = v => (v instanceof Date ? v : parseJSON(v))
  return isWithinInterval(toDate(date), {
    start: toDate(start),
    end: toDate(end)
  })
}

/**
 * Adds days in a specific IANA timezone, then formats the result in that timezone.
 * Equivalent to moment().tz(timezone).add(n, 'days').format(momentFormat).
 *
 * @param {string} timezone  IANA timezone string
 * @param {number} n
 * @param {string} momentFormat
 * @returns {string}
 */
export function addDaysTz(timezone, n, momentFormat) {
  return formatInTimeZone(
    addDays(new Date(), n),
    timezone,
    toDateFnsToken(momentFormat)
  )
}

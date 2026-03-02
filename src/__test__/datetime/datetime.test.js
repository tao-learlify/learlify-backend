import {
  toDateFnsToken,
  isValidDate,
  formatDate,
  formatTz,
  convertTimezone,
  nowUtc,
  nowTz,
  addDaysFormatted,
  subDaysFormatted,
  subMinutesFormatted,
  addMinutesFormatted,
  startOfUtcDay,
  endOfUtcDay,
  isBetween,
  addDaysTz
} from 'common/datetime'

const MADRID_TZ = 'Europe/Madrid'
const FORMAT_DATE = 'YYYY-MM-DD'
const FORMAT_DATETIME = 'YYYY-MM-DD HH:mm:ss'
const FIXED_ISO = '2024-06-15T10:30:00.000Z'
const FIXED_DATE = new Date(FIXED_ISO)

describe('toDateFnsToken', () => {
  it('converts YYYY to yyyy', () => {
    expect(toDateFnsToken('YYYY')).toBe('yyyy')
  })

  it('converts DD to dd', () => {
    expect(toDateFnsToken('DD')).toBe('dd')
  })

  it('converts composite YYYY-MM-DD', () => {
    expect(toDateFnsToken('YYYY-MM-DD')).toBe('yyyy-MM-dd')
  })

  it('converts YYYY-MM-DD HH:mm:ss', () => {
    expect(toDateFnsToken('YYYY-MM-DD HH:mm:ss')).toBe('yyyy-MM-dd HH:mm:ss')
  })

  it('leaves HH:mm:ss unchanged', () => {
    expect(toDateFnsToken('HH:mm:ss')).toBe('HH:mm:ss')
  })
})

describe('isValidDate', () => {
  it('returns true for a valid ISO string', () => {
    expect(isValidDate(FIXED_ISO)).toBe(true)
  })

  it('returns true for a valid Date instance', () => {
    expect(isValidDate(FIXED_DATE)).toBe(true)
  })

  it('returns true for a valid timestamp number', () => {
    expect(isValidDate(FIXED_DATE.getTime())).toBe(true)
  })

  it('returns false for an invalid string', () => {
    expect(isValidDate('not-a-date')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isValidDate('')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidDate(null)).toBe(false)
  })
})

describe('formatDate', () => {
  it('formats a Date instance with YYYY-MM-DD', () => {
    const result = formatDate(new Date('2024-06-15T00:00:00.000Z'), FORMAT_DATE)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formats an ISO string with YYYY-MM-DD HH:mm:ss', () => {
    const result = formatDate('2024-06-15T10:30:45.000Z', FORMAT_DATETIME)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('formatTz', () => {
  it('formats a UTC date in Europe/Madrid timezone', () => {
    const result = formatTz(FIXED_ISO, MADRID_TZ, FORMAT_DATETIME)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(result.startsWith('2024-06-15')).toBe(true)
  })

  it('applies UTC offset correctly for Europe/Madrid in summer (UTC+2)', () => {
    const result = formatTz(FIXED_ISO, MADRID_TZ, 'HH:mm:ss')
    expect(result).toBe('12:30:00')
  })
})

describe('convertTimezone', () => {
  it('returns a zoned wall-clock time string', () => {
    const result = convertTimezone(FIXED_ISO, MADRID_TZ, FORMAT_DATETIME)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('matches formatTz output for the same inputs', () => {
    const ft = formatTz(FIXED_ISO, MADRID_TZ, FORMAT_DATETIME)
    const ct = convertTimezone(FIXED_ISO, MADRID_TZ, FORMAT_DATETIME)
    expect(ct).toBe(ft)
  })
})

describe('nowUtc', () => {
  it('returns a string matching the requested format', () => {
    const result = nowUtc(FORMAT_DATE)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns today\'s date', () => {
    const result = nowUtc(FORMAT_DATE)
    const today = new Date().toISOString().slice(0, 10)
    expect(result).toBe(today)
  })
})

describe('nowTz', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    const result = nowTz(MADRID_TZ, FORMAT_DATE)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a string matching YYYY-MM-DD HH:mm:ss format', () => {
    const result = nowTz(MADRID_TZ, FORMAT_DATETIME)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('addDaysFormatted', () => {
  it('adds 5 days to a date', () => {
    const result = addDaysFormatted('2024-06-10T00:00:00.000Z', 5, FORMAT_DATE)
    expect(result).toBe('2024-06-15')
  })

  it('handles month boundary', () => {
    const result = addDaysFormatted('2024-01-30T00:00:00.000Z', 3, FORMAT_DATE)
    expect(result).toBe('2024-02-02')
  })
})

describe('subDaysFormatted', () => {
  it('subtracts 14 days from a date', () => {
    const result = subDaysFormatted('2024-06-15T00:00:00.000Z', 14, FORMAT_DATE)
    expect(result).toBe('2024-06-01')
  })
})

describe('subMinutesFormatted', () => {
  it('subtracts 10 minutes from a datetime', () => {
    const date = new Date(2024, 5, 15, 10, 30, 0)
    const result = subMinutesFormatted(date, 10, 'HH:mm:ss')
    expect(result).toBe('10:20:00')
  })
})

describe('addMinutesFormatted', () => {
  it('adds 30 minutes to a datetime', () => {
    const date = new Date(2024, 5, 15, 10, 0, 0)
    const result = addMinutesFormatted(date, 30, 'HH:mm:ss')
    expect(result).toBe('10:30:00')
  })
})

describe('startOfUtcDay', () => {
  it('returns a string matching YYYY-MM-DD HH:mm:ss', () => {
    const result = startOfUtcDay(FORMAT_DATETIME)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/)
  })
})

describe('endOfUtcDay', () => {
  it('returns a string matching YYYY-MM-DD HH:mm:ss', () => {
    const result = endOfUtcDay(FORMAT_DATETIME)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} 23:59:59$/)
  })
})

describe('isBetween', () => {
  const start = '2024-06-15T00:00:00.000Z'
  const end = '2024-06-15T23:59:59.000Z'

  it('returns true when date is within interval', () => {
    expect(isBetween('2024-06-15T10:00:00.000Z', start, end)).toBe(true)
  })

  it('returns true for boundary values', () => {
    expect(isBetween(start, start, end)).toBe(true)
    expect(isBetween(end, start, end)).toBe(true)
  })

  it('returns false when date is before interval', () => {
    expect(isBetween('2024-06-14T23:59:59.000Z', start, end)).toBe(false)
  })

  it('returns false when date is after interval', () => {
    expect(isBetween('2024-06-16T00:00:00.000Z', start, end)).toBe(false)
  })
})

describe('addDaysTz', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    const result = addDaysTz(MADRID_TZ, 5, FORMAT_DATE)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('future date is after today in the same timezone', () => {
    const today = nowTz(MADRID_TZ, FORMAT_DATE)
    const future = addDaysTz(MADRID_TZ, 5, FORMAT_DATE)
    expect(future > today).toBe(true)
  })
})

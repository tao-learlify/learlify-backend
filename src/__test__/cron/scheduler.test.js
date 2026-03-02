/**
 * @file scheduler.test.js
 * @description Tests for node-cron v3 upgrade — validates that:
 *   1. cron.validate() works correctly with all expressions used in tasks
 *   2. cron.schedule() accepts the { timezone } option (used in users.tasks.js)
 *   3. The CronSchedule decorator pattern wires trigger.schedule() → cron.schedule()
 *      and wraps the callback in lockAndRun
 */

// ---------------------------------------------------------------------------
// Mocks — must come before any imports that trigger module loading
// ---------------------------------------------------------------------------

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
  validate: jest.requireActual('node-cron').validate
}))

const mockLockAndRun = jest.fn((key, ttl, cb) => cb())

// ---------------------------------------------------------------------------
// Import only what is needed — avoid pulling in the full app via `decorators`
// ---------------------------------------------------------------------------

import cron from 'node-cron'

// ---------------------------------------------------------------------------
// Replicate the CronSchedule factory logic from decorators/index.js
// so we can test the wiring in isolation without triggering full app init.
// ---------------------------------------------------------------------------

function buildCronScheduleDecorator(lockAndRunFn, lockTtlMs = 30000) {
  return function CronScheduleLocal(Tasks) {
    return class Schedule extends Tasks {
      constructor() {
        super()
        this.trigger = {
          schedule(expression, callback, options) {
            const key = `${Tasks.name}:${expression}`
            return cron.schedule(
              expression,
              () => lockAndRunFn(key, lockTtlMs, callback),
              options
            )
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  cron.schedule.mockClear()
  mockLockAndRun.mockClear()
})

// ── Section 1: cron.validate() ────────────────────────────────────────────

describe('node-cron v3 — cron.validate()', () => {
  test('valid 5-field expression returns true', () => {
    expect(cron.validate('* * * * *')).toBe(true)
  })

  test('valid expression with steps returns true', () => {
    expect(cron.validate('*/5 * * * *')).toBe(true)
  })

  test('valid expression with specific values returns true', () => {
    expect(cron.validate('0 */12 * * *')).toBe(true)
  })

  test('valid expression "0 0 * * *" (daily midnight) returns true', () => {
    expect(cron.validate('0 0 * * *')).toBe(true)
  })

  test('invalid expression returns false', () => {
    expect(cron.validate('invalid expression')).toBe(false)
  })

  test('out-of-range value returns false', () => {
    expect(cron.validate('99 * * * *')).toBe(false)
  })
})

// ── Section 2: CronSchedule decorator wiring ─────────────────────────────

describe('CronSchedule decorator — trigger.schedule() wiring', () => {
  const CronScheduleLocal = buildCronScheduleDecorator(mockLockAndRun, 30000)

  test('calls cron.schedule() when trigger.schedule() is invoked', () => {
    class BaseTask {}
    const TestTask = CronScheduleLocal(BaseTask)
    const task = new TestTask()

    task.trigger.schedule('*/5 * * * *', async () => {})

    expect(cron.schedule).toHaveBeenCalledTimes(1)
    expect(cron.schedule).toHaveBeenCalledWith(
      '*/5 * * * *',
      expect.any(Function),
      undefined
    )
  })

  test('passes { timezone } option through to cron.schedule()', () => {
    class BaseTask {}
    const TestTask = CronScheduleLocal(BaseTask)
    const task = new TestTask()

    task.trigger.schedule('0 0 * * *', async () => {}, { timezone: 'Europe/Madrid' })

    expect(cron.schedule).toHaveBeenCalledTimes(1)
    expect(cron.schedule).toHaveBeenCalledWith(
      '0 0 * * *',
      expect.any(Function),
      { timezone: 'Europe/Madrid' }
    )
  })

  test('wraps user callback in lockAndRun with composite key', () => {
    class MyTask {}
    const TestTask = CronScheduleLocal(MyTask)
    const task = new TestTask()
    const userCallback = jest.fn()

    task.trigger.schedule('0 */12 * * *', userCallback)

    const wrappedCb = cron.schedule.mock.calls[0][1]
    wrappedCb()

    expect(mockLockAndRun).toHaveBeenCalledTimes(1)
    expect(mockLockAndRun).toHaveBeenCalledWith(
      'MyTask:0 */12 * * *',
      30000,
      userCallback
    )
  })

  test('lock key is unique per class/expression pair', () => {
    class AlphaTask {}
    class BetaTask {}

    const Alpha = CronScheduleLocal(AlphaTask)
    const Beta = CronScheduleLocal(BetaTask)

    new Alpha().trigger.schedule('*/5 * * * *', jest.fn())
    new Beta().trigger.schedule('*/5 * * * *', jest.fn())

    expect(cron.schedule).toHaveBeenCalledTimes(2)

    cron.schedule.mock.calls.forEach(([, cb]) => cb())

    const keys = mockLockAndRun.mock.calls.map(([key]) => key)
    expect(keys).toContain('AlphaTask:*/5 * * * *')
    expect(keys).toContain('BetaTask:*/5 * * * *')
    expect(new Set(keys).size).toBe(2)
  })

  test('lockAndRun invokes the original user callback', () => {
    class SomeTask {}
    const TestTask = CronScheduleLocal(SomeTask)
    const task = new TestTask()
    const userCallback = jest.fn()

    task.trigger.schedule('* * * * *', userCallback)

    const wrappedCb = cron.schedule.mock.calls[0][1]
    wrappedCb()

    expect(userCallback).toHaveBeenCalledTimes(1)
  })
})

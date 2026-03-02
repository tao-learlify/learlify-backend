jest.mock('config/db', () => {
  const db = jest.fn()

  db.raw = jest.fn()
  db.transaction = jest.fn()

  return { __esModule: true, default: db }
})

import db from 'config/db'

const mockTrx = {}

beforeEach(() => {
  jest.clearAllMocks()

  db.raw.mockResolvedValue([[{ '1': 1 }]])

  db.mockImplementation(() => ({
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([1])
  }))

  db.transaction.mockImplementation(async cb => cb(mockTrx))
})

describe('Knex DB interface — safety net (Knex 3 compatibility)', () => {
  describe('db.raw()', () => {
    it('resolves SELECT 1 probe', async () => {
      const result = await db.raw('SELECT 1')
      expect(result).toBeDefined()
      expect(db.raw).toHaveBeenCalledWith('SELECT 1')
    })

    it('result follows mysql2 double-array format [[rows]]', async () => {
      const [[row]] = await db.raw('SELECT 1')
      expect(row).toHaveProperty('1', 1)
    })
  })

  describe('db() table query', () => {
    it('returns null when record not found via WHERE + first()', async () => {
      const instance = { where: jest.fn(), first: jest.fn() }
      instance.where.mockReturnValue(instance)
      instance.first.mockResolvedValue(null)
      db.mockReturnValueOnce(instance)

      const result = await db('stripe_events')
        .where({ event_id: 'evt_nonexistent' })
        .first()

      expect(result).toBeNull()
    })

    it('returns record when found via WHERE + first()', async () => {
      const record = { event_id: 'evt_123', type: 'payment_intent.succeeded' }
      const instance = { where: jest.fn(), first: jest.fn() }
      instance.where.mockReturnValue(instance)
      instance.first.mockResolvedValue(record)
      db.mockReturnValueOnce(instance)

      const result = await db('stripe_events')
        .where({ event_id: 'evt_123' })
        .first()

      expect(result).toEqual(record)
    })

    it('insert() resolves with row count', async () => {
      const instance = { insert: jest.fn().mockResolvedValue([1]) }
      db.mockReturnValueOnce(instance)

      const result = await db('stripe_events').insert({
        event_id: 'evt_456',
        type: 'payment_intent.succeeded'
      })

      expect(result).toEqual([1])
    })
  })

  describe('db.transaction()', () => {
    it('returns the resolved value of the callback', async () => {
      db.transaction.mockImplementationOnce(async cb => cb(mockTrx))

      const result = await db.transaction(async () => ({ committed: true }))

      expect(result).toEqual({ committed: true })
    })

    it('propagates rejection thrown inside callback', async () => {
      db.transaction.mockImplementationOnce(async cb => cb(mockTrx))

      await expect(
        db.transaction(async () => {
          throw new Error('rollback test')
        })
      ).rejects.toThrow('rollback test')
    })

    it('passes trx object to the callback', async () => {
      let received

      db.transaction.mockImplementationOnce(async cb => cb(mockTrx))

      await db.transaction(async trx => {
        received = trx
      })

      expect(received).toBe(mockTrx)
    })

    it('nested Objection-style call: Model.knex().transaction() same API', async () => {
      const fakeKnex = { transaction: db.transaction }

      db.transaction.mockImplementationOnce(async cb => cb(mockTrx))

      const result = await fakeKnex.transaction(async trx => ({
        trxReceived: trx === mockTrx
      }))

      expect(result.trxReceived).toBe(true)
    })
  })
})

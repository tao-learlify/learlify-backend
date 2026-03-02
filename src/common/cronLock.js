import Redlock from 'redlock'
import { getRedisClient } from 'config/redis'
import logger from 'utils/logger'

let redlock = null

function getRedlock() {
  if (redlock) return redlock

  const client = getRedisClient()
  if (!client) return null

  redlock = new Redlock([client], {
    driftFactor: 0.01,
    retryCount: 0,
    retryDelay: 200,
    retryJitter: 0,
    automaticExtensionThreshold: 500
  })

  redlock.on('error', err => {
    if (err.message && err.message.includes('already exists')) return
    logger.error('redlock.error', { message: err.message })
  })

  return redlock
}

async function lockAndRun(key, ttlMs, fn) {
  const lock = getRedlock()

  if (!lock) {
    return fn()
  }

  let acquired = null

  try {
    acquired = await lock.acquire([`lock:${key}`], ttlMs)
  } catch (_err) {
    logger.debug('cronLock.skipped', { key })
    return
  }

  try {
    await fn()
  } finally {
    try {
      await acquired.release()
    } catch (releaseErr) {
      logger.warn('cronLock.release.failed', {
        key,
        message: releaseErr.message
      })
    }
  }
}

export { lockAndRun }

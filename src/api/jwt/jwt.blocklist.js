import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { getRedisClient } from 'config/redis'
import logger from 'utils/logger'

const BLOCKLIST_PREFIX = 'blocklist:'

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getRemainingTtl(token) {
  try {
    const decoded = jwt.decode(token)
    if (!decoded || !decoded.exp) return 0
    const remaining = decoded.exp - Math.floor(Date.now() / 1000)
    return remaining > 0 ? remaining : 0
  } catch (_) {
    return 0
  }
}

async function addToBlocklist(token) {
  const redis = getRedisClient()

  if (!redis) {
    logger.warn(
      'jwt.blocklist.redis.unavailable — token not stored in blocklist'
    )
    return false
  }

  const ttl = getRemainingTtl(token)

  if (ttl <= 0) {
    return true
  }

  const key = BLOCKLIST_PREFIX + tokenHash(token)
  await redis.set(key, '1', 'EX', ttl)

  return true
}

async function isTokenBlocked(token) {
  const redis = getRedisClient()

  if (!redis) return false

  const key = BLOCKLIST_PREFIX + tokenHash(token)
  const value = await redis.get(key)

  return value !== null
}

export { addToBlocklist, isTokenBlocked, tokenHash }

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import { getRedisClient } from 'config/redis'
import logger from 'utils/logger'

const BLOCKLIST_PREFIX = 'blocklist:'

export function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getRemainingTtl(token: string): number {
  try {
    const decoded = jwt.decode(token)
    if (typeof decoded !== 'object' || decoded === null || !('exp' in decoded)) return 0
    const payload = decoded as JwtPayload
    if (!payload.exp) return 0
    const remaining = payload.exp - Math.floor(Date.now() / 1000)
    return remaining > 0 ? remaining : 0
  } catch (_) {
    return 0
  }
}

export async function addToBlocklist(token: string): Promise<boolean> {
  const redis = getRedisClient()

  if (!redis) {
    (logger as unknown as { warn(k: string): void }).warn(
      'jwt.blocklist.redis.unavailable — token not stored in blocklist'
    )
    return false
  }

  const ttl = getRemainingTtl(token)

  if (ttl <= 0) {
    return true
  }

  const key = BLOCKLIST_PREFIX + tokenHash(token)
  await (redis as unknown as { set(k: string, v: string, ex: string, ttl: number): Promise<void> }).set(key, '1', 'EX', ttl)

  return true
}

export async function isTokenBlocked(token: string): Promise<boolean> {
  const redis = getRedisClient()

  if (!redis) return false

  const key = BLOCKLIST_PREFIX + tokenHash(token)
  const value = await (redis as unknown as { get(k: string): Promise<string | null> }).get(key)

  return value !== null
}

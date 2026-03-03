  import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import db from 'config/db'
import { getRedisClient } from 'config/redis'
import logger from 'utils/logger'

const router = express.Router()

interface ProbeResult {
  status: 'ok' | 'down' | 'unconfigured'
  latencyMs?: number
  error?: string
}

async function probeDb(): Promise<ProbeResult> {
  const start = Date.now()
  try {
    await (db as unknown as { raw(sql: string): Promise<unknown> }).raw('SELECT 1')
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    (logger as unknown as { error(k: string, v: unknown): void }).error('health.db.probe', { message: (err as Error).message })
    return { status: 'down', latencyMs: Date.now() - start, error: (err as Error).message }
  }
}

async function probeRedis(): Promise<ProbeResult> {
  const redis = getRedisClient()

  if (!redis) {
    return { status: 'unconfigured' }
  }

  const start = Date.now()
  try {
    await (redis as unknown as { ping(): Promise<unknown> }).ping()
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    (logger as unknown as { error(k: string, v: unknown): void }).error('health.redis.probe', { message: (err as Error).message })
    return { status: 'down', latencyMs: Date.now() - start, error: (err as Error).message }
  }
}

router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [dbProbe, redisProbe] = await Promise.all([probeDb(), probeRedis()])

    const isDown = dbProbe.status === 'down'
    const isDegraded = !isDown && redisProbe.status === 'down'

    const overall = isDown ? 'down' : isDegraded ? 'degraded' : 'ok'

    const statusCode = isDown ? 503 : 200

    return res.status(statusCode).json({
      status: overall,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbProbe,
        redis: redisProbe
      }
    })
  } catch (err) {
    return next(err)
  }
})

export default router

import express from 'express'
import db from 'config/db'
import { getRedisClient } from 'config/redis'
import logger from 'utils/logger'

const router = express.Router()

async function probeDb() {
  const start = Date.now()
  try {
    await db.raw('SELECT 1')
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    logger.error('health.db.probe', { message: err.message })
    return { status: 'down', latencyMs: Date.now() - start, error: err.message }
  }
}

async function probeRedis() {
  const redis = getRedisClient()

  if (!redis) {
    return { status: 'unconfigured' }
  }

  const start = Date.now()
  try {
    await redis.ping()
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    logger.error('health.redis.probe', { message: err.message })
    return { status: 'down', latencyMs: Date.now() - start, error: err.message }
  }
}

router.get('/health', async (_req, res, next) => {
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

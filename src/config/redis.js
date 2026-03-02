import Redis from 'ioredis'
import logger from 'utils/logger'

let client = null

function createRedisClient() {
  if (!process.env.REDIS_URL) {
    return null
  }

  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000)
      return delay
    }
  })

  redis.on('connect', () => logger.info('redis.connect'))
  redis.on('error', err =>
    logger.error('redis.error', { message: err.message })
  )
  redis.on('close', () => logger.warn('redis.close'))

  redis
    .connect()
    .catch(err =>
      logger.error('redis.connect.failed', { message: err.message })
    )

  return redis
}

function getRedisClient() {
  if (client === null) {
    client = createRedisClient()
  }
  return client
}

async function closeRedisClient() {
  if (client) {
    await client.quit()
    client = null
  }
}

export { getRedisClient, closeRedisClient }

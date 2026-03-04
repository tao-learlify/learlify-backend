import type { RequestHandler } from 'express'
import client from 'prom-client'

const register = client.register

client.collectDefaultMetrics({ register })

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
})

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
})

const metricsCollector: RequestHandler = (req, res, next): void => {
  const start = process.hrtime.bigint()

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start
    const durationSec = Number(durationNs) / 1e9

    const route = req.route
      ? req.baseUrl + String((req.route as { path: unknown }).path)
      : req.path

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode)
    }

    httpRequestsTotal.inc(labels)
    httpRequestDurationSeconds.observe(labels, durationSec)
  })

  next()
}

export { metricsCollector, register }

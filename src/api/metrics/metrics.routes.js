import express from 'express'
import { register } from 'middlewares/metricsCollector'

const router = express.Router()

router.get('/metrics', async (_req, res) => {
  if (process.env.METRICS_ENABLED === 'false') {
    return res.status(404).json({ message: 'Not Found', statusCode: 404 })
  }

  try {
    const metrics = await register.metrics()
    res.set('Content-Type', register.contentType)
    return res.end(metrics)
  } catch (err) {
    return res.status(500).json({ message: err.message, statusCode: 500 })
  }
})

export default router

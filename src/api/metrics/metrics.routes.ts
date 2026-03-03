import express from 'express'
import type { Request, Response } from 'express'
import type { Registry } from 'prom-client'
import { register } from 'middlewares/metricsCollector'

const router = express.Router()

router.get('/metrics', async (_req: Request, res: Response) => {
  if (process.env.METRICS_ENABLED === 'false') {
    return res.status(404).json({ message: 'Not Found', statusCode: 404 })
  }

  try {
    const typedRegister = register as unknown as Registry
    const metrics = await typedRegister.metrics()
    res.set('Content-Type', typedRegister.contentType)
    return res.end(metrics)
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message, statusCode: 500 })
  }
})

export default router

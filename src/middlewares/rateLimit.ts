import rateLimit from 'express-rate-limit'
import root from 'config/root'

export const globalLimiter = rateLimit({
  windowMs: root.limitRequest.windowMs,
  max: root.limitRequest.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: root.limitRequest.message, statusCode: 429 }
})

export const authLimiter = rateLimit({
  windowMs: root.limitRequest.windowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: root.limitRequest.message, statusCode: 429 }
})

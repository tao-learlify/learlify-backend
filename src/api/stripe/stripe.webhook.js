import express from 'express'
import Stripe from 'stripe'
import { Logger } from 'api/logger'
import db from 'config/db'

const router = express.Router()

const logger = Logger.Service

const stripe = new Stripe(process.env.STRIPE_API_KEY)

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

/**
 * Stripe webhook endpoint.
 *
 * Must be mounted BEFORE the global json() middleware so that
 * express.raw() receives the raw body required by constructEvent.
 *
 * @see https://stripe.com/docs/webhooks/signatures
 */
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']

    if (!WEBHOOK_SECRET) {
      logger.error('STRIPE_WEBHOOK_SECRET is not set')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
    } catch (err) {
      logger.error('stripe.webhook.signature', { message: err.message })
      return res.status(400).json({
        error: `Webhook signature verification failed: ${err.message}`
      })
    }

    let alreadyProcessed

    try {
      alreadyProcessed = await db('stripe_events')
        .where({ event_id: event.id })
        .first()
    } catch (err) {
      logger.error('stripe.webhook.db.read', { message: err.message })
      return res
        .status(500)
        .json({ error: 'Database error processing webhook' })
    }

    if (alreadyProcessed) {
      logger.info('stripe.webhook.duplicate', { eventId: event.id })
      return res.status(200).json({ received: true, duplicate: true })
    }

    try {
      await db('stripe_events').insert({
        event_id: event.id,
        type: event.type
      })

      logger.info('stripe.webhook.received', { type: event.type, id: event.id })

      switch (event.type) {
        case 'payment_intent.succeeded':
          logger.info('stripe.webhook.payment_intent.succeeded', {
            id: event.data.object.id
          })
          break

        case 'payment_intent.payment_failed':
          logger.warn('stripe.webhook.payment_intent.failed', {
            id: event.data.object.id
          })
          break

        case 'customer.subscription.deleted':
          logger.info('stripe.webhook.subscription.deleted', {
            id: event.data.object.id
          })
          break

        default:
          logger.info('stripe.webhook.unhandled', { type: event.type })
      }

      return res.status(200).json({ received: true })
    } catch (err) {
      logger.error('stripe.webhook.handler', {
        message: err.message,
        stack: err.stack
      })
      return res
        .status(500)
        .json({ error: 'Internal server error processing webhook' })
    }
  }
)

export default router

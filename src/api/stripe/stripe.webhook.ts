import express from 'express'
import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { Logger } from 'api/logger'
import db from 'config/db'

const router = express.Router()

const logger = Logger.Service

const stripe = new (Stripe as unknown as new (key: string) => Stripe)(
  process.env.STRIPE_API_KEY!
)

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string

    if (!WEBHOOK_SECRET) {
      logger.error('STRIPE_WEBHOOK_SECRET is not set')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
    } catch (err) {
      logger.error('stripe.webhook.signature', { message: (err as Error).message })
      return res
        .status(400)
        .json({
          error: `Webhook signature verification failed: ${(err as Error).message}`
        })
    }

    let alreadyProcessed

    try {
      alreadyProcessed = await db('stripe_events')
        .where({ event_id: event.id })
        .first()
    } catch (err) {
      logger.error('stripe.webhook.db.read', { message: (err as Error).message })
      return res.status(500).json({ error: 'Database error processing webhook' })
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
            id: (event.data.object as Stripe.PaymentIntent).id
          })
          break

        case 'payment_intent.payment_failed':
          logger.warn('stripe.webhook.payment_intent.failed', {
            id: (event.data.object as Stripe.PaymentIntent).id
          })
          break

        case 'customer.subscription.deleted':
          logger.info('stripe.webhook.subscription.deleted', {
            id: (event.data.object as Stripe.Subscription).id
          })
          break

        default:
          logger.info('stripe.webhook.unhandled', { type: event.type })
      }

      return res.status(200).json({ received: true })
    } catch (err) {
      logger.error('stripe.webhook.handler', {
        message: (err as Error).message,
        stack: (err as Error).stack
      })
      return res
        .status(500)
        .json({ error: 'Internal server error processing webhook' })
    }
  }
)

export default router

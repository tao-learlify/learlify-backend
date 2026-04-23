import webpush from 'web-push'
import { env } from 'config/env'
import { Logger } from 'api/logger'
import PushSubscription from './push.model'
import type { PushSubscriptionData, SendPushParams } from './push.types'

class PushService {
  private logger: typeof Logger.Service

  constructor() {
    this.logger = Logger.Service

    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        `mailto:${env.VAPID_CONTACT_EMAIL}`,
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
      )
    }
  }

  getVapidPublicKey(): string {
    return env.VAPID_PUBLIC_KEY ?? ''
  }

  async subscribe(data: PushSubscriptionData): Promise<PushSubscription> {
    const existing = await PushSubscription.query().findOne({
      userId: data.userId,
      endpoint: data.endpoint
    })

    if (existing) {
      return existing
    }

    return PushSubscription.query().insertAndFetch(data)
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await PushSubscription.query()
      .delete()
      .where({ userId, endpoint })
  }

  async send({ userId, title, body, url = '/' }: SendPushParams): Promise<void> {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      this.logger.warn('[push] VAPID keys not configured — skipping push notification')
      return
    }

    const subscriptions = await PushSubscription.query().where({ userId })

    const payload = JSON.stringify({ title, body, url })

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'rejected') {
        const err = result.reason as { statusCode?: number }
        // 410 Gone = subscription expired/revoked, clean it up
        if (err?.statusCode === 410) {
          await PushSubscription.query()
            .delete()
            .where({ userId, endpoint: subscriptions[i].endpoint })
        } else {
          this.logger.error('[push] Failed to send notification', err)
        }
      }
    }
  }
}

export { PushService }

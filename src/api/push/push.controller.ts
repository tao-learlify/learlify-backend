import type { Request, Response } from 'express'
import { Bind } from 'decorators'
import { PushService } from './push.service'

export class PushController {
  private pushService: PushService

  constructor() {
    this.pushService = new PushService()
  }

  @Bind
  async getVapidPublicKey(_req: Request, res: Response): Promise<Response> {
    return res.status(200).json({
      message: 'VAPID public key retrieved successfully',
      response: { publicKey: this.pushService.getVapidPublicKey() },
      statusCode: 200
    })
  }

  @Bind
  async subscribe(req: Request, res: Response): Promise<Response> {
    const { endpoint, p256dh, auth } = req.body as { endpoint: string; p256dh: string; auth: string }

    const subscription = await this.pushService.subscribe({
      userId: req.user!.id,
      endpoint,
      p256dh,
      auth
    })

    return res.status(201).json({
      message: 'Push subscription saved successfully',
      response: subscription,
      statusCode: 201
    })
  }

  @Bind
  async unsubscribe(req: Request, res: Response): Promise<Response> {
    const { endpoint } = req.body as { endpoint: string }

    await this.pushService.unsubscribe(req.user!.id, endpoint)

    return res.status(200).json({
      message: 'Push subscription removed successfully',
      statusCode: 200
    })
  }
}

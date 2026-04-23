export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionData {
  userId: number
  endpoint: string
  p256dh: string
  auth: string
}

export interface SendPushParams {
  userId: number
  title: string
  body: string
  url?: string
}

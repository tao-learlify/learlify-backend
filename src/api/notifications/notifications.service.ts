import { Bind } from 'decorators'
import moment from 'moment'
import Notification from './notifications.model'
import { UsersService } from 'api/users/users.service'
import { NotificationTypesService } from 'api/notification-types/notificationTypes.service'
import { Logger } from 'api/logger'
import { Socket } from 'modules'
import { NOTIFICATION } from 'gateways/events'
import { NotificationContext } from './notification.context'
import { PushService } from 'api/push/push.service'
import type {
  NotificationData,
  NotificationTypeRecord,
  GetAllNotificationsParams,
  UpdateNotificationData,
  RealtimeNotificationParams
} from './notifications.types'

class NotificationsService {
  private readonly _relationships: { notificationType: boolean }
  private readonly _pagesize: number
  private usersService: UsersService
  private notificationTypesService: NotificationTypesService
  private pushService: PushService
  private logger: typeof Logger.Service

  constructor() {
    this.usersService = new UsersService()
    this.notificationTypesService = new NotificationTypesService()
    this.pushService = new PushService()
    this.logger = Logger.Service
    this._relationships = { notificationType: true }
    this._pagesize = 10
  }

  @Bind
  async create(data: NotificationData): Promise<Notification> {
    const stream = new Socket()

    const user = await this.usersService.getOne({ id: data.userId }) as unknown as { email: string }

    const notificationType = await this.notificationTypesService.getOne(
      { id: data.type }
    ) as unknown as NotificationTypeRecord

    const now = moment()
    const expirationDate = moment(now).add(notificationType.expirationTime, 'days')

    data.createdAt = data.updatedAt = now.toDate()
    data.expirationDate = expirationDate.toDate()

    const notification = await Notification.query()
      .insertAndFetch(data)
      .withGraphFetched(this._relationships)

    stream.socket.to(user.email).emit(NOTIFICATION, notification)

    // Also deliver via Web Push for PWA / offline users
    this.pushService.send({
      userId: data.userId,
      title: 'AptisGo',
      body: data.message ?? 'You have a new notification.',
      url: '/'
    }).catch((err) => this.logger.error('[push] Failed to send push notification', err))

    return notification
  }

  @Bind
  getAll({ unreads, page, ...options }: GetAllNotificationsParams) {
    if (unreads) {
      return Notification.query()
        .where({ read: false, ...options } as Record<string, unknown>)
        .count('createdAt as total')
    }

    if (page) {
      return Notification.query()
        .where(options as Record<string, unknown>)
        .page(page - 1, this._pagesize)
        .withGraphFetched(this._relationships)
    }

    return Notification.query()
      .where(options as Record<string, unknown>)
      .limit(5)
      .orderBy('createdAt', 'desc')
      .withGraphFetched(this._relationships)
  }

  getOne(id: number | string) {
    return Notification.query().findById(id)
  }

  updateOne(id: number | string, data: UpdateNotificationData) {
    return Notification.query().patchAndFetchById(id as number, data)
  }

  @Bind
  updateAllAsRead(data: { userId: number }) {
    return Notification.query()
      .where(data as Record<string, unknown>)
      .update({ read: true })
  }

  async realtime({ context, user, ...data }: RealtimeNotificationParams): Promise<Notification> {
    const { socket } = new Socket()

    const type = await new NotificationContext().getContextIdentifier({ name: context }) as unknown as { id: number }

    const notification = await Notification.query()
      .insertAndFetch({
        type: type.id,
        ...(data as Partial<NotificationData>)
      })
      .withGraphFetched(this._relationships)

    try {
      socket.to(user.email).emit(NOTIFICATION, notification)
    } catch (err) {
      this.logger.error('Fail to send notification on socket', err)
    }

    return notification
  }

  deleteExpired() {
    const now = moment().toDate()
    return Notification.query().delete().where('expirationDate', '<', now)
  }
}

export { NotificationsService }

import { Bind } from 'decorators'
import moment from 'moment'
import Notification from './notifications.model'
import { UsersService } from 'api/users/users.service'
import { NotificationTypesService } from 'api/notification-types/notificationTypes.service'
import { Logger } from 'api/logger'
import { Socket } from 'modules'
import { NOTIFICATION } from 'gateways/events'
import { NotificationContext } from './notification.context'

class NotificationsService {
  /**
   * @type {{}}
   */
  #relationships
  #pagesize

  constructor() {
    this.usersService = new UsersService()
    this.notificationTypesService = new NotificationTypesService()
    this.logger = Logger.Service
    this.#relationships = {
      notificationType: true
    }
    this.#pagesize = 10
  }

  @Bind
  /**
   * @typedef {Object} NotificationProperties
   * @property {number} senderId
   * @property {number} userId
   * @property {string} message
   * @property {boolean} read
   * @property {boolean} deleted
   * @property {number} type
   *
   * @param {NotificationProperties} data
   */
  async create(data) {
    const stream = new Socket()

    const user = await this.usersService.getOne({
      id: data.userId
    })

    const notificationType = await this.notificationTypesService.getOne({
      id: data.type
    })

    const now = moment()
    const expirationDate = moment(now).add(
      notificationType.expirationTime,
      'days'
    )

    data.createdAt = data.updatedAt = now.toDate()
    data.expirationDate = expirationDate.toDate()

    const notification = await Notification.query()
      .insertAndFetch(data)
      .withGraphFetched(this.#relationships)

    /**
     * @description
     * Sending notifications to the user.
     */
    stream.socket.to(user.email).emit(NOTIFICATION, notification)

    return notification
  }

  @Bind
  /**
   * @param {NotificationProperties} options
   */
  getAll({ unreads, page, ...options }) {
    if (unreads) {
      return Notification.query()
        .where({ read: false, ...options })
        .count('createdAt as total')
    }

    if (page) {
      return Notification.query()
        .where(options)
        .page(page - 1, this.#pagesize)
        .withGraphFetched(this.#relationships)
    }

    return Notification.query()
      .where(options)
      .limit(5)
      .orderBy('createdAt', 'desc')
      .withGraphFetched(this.#relationships)
  }

  getOne(id) {
    return Notification.query().findById(id)
  }

  updateOne(id, data) {
    return Notification.query().patchAndFetchById(id, data)
  }

  @Bind
  updateAllAsRead(data) {
    return Notification.query().where(data).update({ read: true })
  }

  async realtime({ context, user, ...data }) {
    const { socket } = new Socket()

    const type = await new NotificationContext().getContextIdentifier({
      name: context
    })

    const notification = await Notification.query()
      .insertAndFetch({
        type: type.id,
        ...data
      })
      .withGraphFetched(this.#relationships)

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

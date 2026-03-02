import { Bind } from 'decorators'
import { NotificationsService } from './notifications.service'
import { NotFoundException } from 'exceptions'
import { createPaginationStack } from 'functions'

export class NotificationsController {
  constructor() {
    this.notificationsService = new NotificationsService()
  }

  @Bind
  async create(req, res) {
    const { senderId, userId, message, read, deleted, type } = req.body

    const notification = await this.notificationsService.create({
      senderId,
      userId,
      message,
      read,
      deleted,
      type
    })

    res.status(200).json({
      message: 'Notification created succesfully',
      response: notification,
      statusCode: 201
    })
  }

  @Bind
  async getAll(req, res) {
    /**
     * The !req.query.unreads is for making the opposite of the purpose on marking this request.
     */
    const notifications = await this.notificationsService.getAll({
      userId: req.user.id,
      page: req.query.page
    })

    if (req.query.page) {
      return res.status(200).json({
        message: 'Notifications obtained successfully',
        response: {
          notifications: notifications.results
        },
        pagination: createPaginationStack({
          limit: 10,
          page: req.query.page,
          total: notifications.total
        }),
        statusCode: 200
      })
    }

    if (req.query.unreads) {
      const [unreads] = await this.notificationsService.getAll({
        userId: req.user.id,
        unreads: true
      })

      const notifications = await this.notificationsService.getAll({
        read: false,
        userId: req.user.id,
        page: req.query.page
      })

      return res.status(200).json({
        message: 'Notifications obtained succesfully',
        response: {
          notifications,
          unreads: unreads?.total ?? 0
        },
        statusCode: 200
      })
    }

    res.status(200).json({
      message: 'Notifications obtained succesfully',
      response: notifications,
      statusCode: 200
    })
  }

  @Bind
  async getOne(req, res) {
    const notification = await this.notificationsService.getOne(req.params.id)

    if (notification) {
      return res.status(200).json({
        message: 'Notification obtained successfully',
        response: notification,
        statusCode: 200
      })
    }

    throw new NotFoundException('Notification Not Found')
  }

  @Bind
  async updateOne(req, res) {
    const { id } = req.params

    const data = req.body

    const updated = await this.notificationsService.updateOne(id, data)

    res.status(200).json({
      message: 'Notification updated succesfully',
      response: updated,
      statusCode: 200
    })
  }

  @Bind
  async markAllAsRead(req, res) {
    const notifications = await this.notificationsService.updateAllAsRead({
      userId: req.user.id
    })

    return res.status(201).json({
      response: notifications,
      statusCode: 201
    })
  }

  @Bind
  async deleteExpired(req, res) {
    const numDeleted = await this.notificationsService.deleteExpired()

    res.status(200).json({
      message: 'Expired notifications deleted successfully',
      response: numDeleted,
      statusCode: 200
    })
  }
}

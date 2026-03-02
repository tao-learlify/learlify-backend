import { Injectable, Bind } from 'decorators'
import { Logger } from 'api/logger'
import Schedule from './schedule.model'
import Classes from 'api/classes/classes.model'
import Meetings from 'api/meetings/meetings.model'
import moment from 'moment-timezone'

/**
 * @typedef {Object} Source
 * @property {Date} startDate
 * @property {Date} endDate
 * @property {number} langId
 * @property {number} userId
 * @property {number} optionId
 */

const relationShip = Symbol('relationShip')

@Injectable
class ScheduleService {
  constructor() {
    this.props = {
      clientAttributes: [
        'id',
        'startDate',
        'endDate',
        'taken',
        'notified',
        'notes',
        'streaming'
      ],
      endDate: 'endDate',
      startDate: 'startDate',
      anticipatedStartDate: 'anticipatedStartDate'
    }
    this[relationShip] = {
      create: {
        teacher: {
          $modify: ['withName']
        }
      },
      getAll: {
        language: true,
        classes: {
          $modify: ['withClassName'],
          meetings: {
            $modify: ['withData']
          }
        },
        teacher: {
          $modify: ['withName']
        }
      },
      getAllExpiration: {
        language: true,
        classes: {
          $modify: ['activeWithNoExpiration'],
          meetings: {
            $modify: ['withData']
          }
        },
        teacher: {
          $modify: ['withName']
        }
      }
    }
    this.logger = Logger.Service
  }

  /**
   * @param {Schedule} schedule
   * @param {string} timezone
   */
  static scheduleTimezoneConversion(schedule, timezone) {
    const logger = Logger.Service

    const format = 'YYYY-MM-DD HH:mm:ss'

    if (schedule) {
      const output = {
        ...schedule,
        startDate: moment(schedule.startDate)
          .tz(timezone, false)
          .format(format),
        endDate: moment(schedule.endDate).tz(timezone, false).format(format)
      }

      logger.debug('Timezone', {
        startDate: moment(schedule.startDate).tz(timezone, false).format(),
        endDate: moment(schedule.endDate).tz(timezone, false).format()
      })

      return output
    }
    return schedule
  }

  /**
   * @param {Source} options
   * @returns {Promise<Schedule>}
   */
  create(options) {
    const { create } = this[relationShip]

    return Schedule.query().insertAndFetch(options).withGraphFetched(create)
  }

  /**
   * @param {number} id
   */
  exist(id) {
    return Schedule.query().select(['id']).where({ id })
  }

  /**
   * @param {number} id
   */
  remove(id) {
    return Schedule.query().deleteById(id)
  }

  /**
   * @param {Source} options
   * @returns {Promise<Schedule []>}
   */
  @Bind
  getAll({ date, ...options }) {
    const {
      clientAttributes,
      anticipatedStartDate,
      endDate,
      startDate
    } = this.props

    const { getAll } = this[relationShip]

    if (date) {
      const whereOptions = {}

      if ('userId' in options) {
        whereOptions.userId = options.userId
      }

      if ('langId' in options) {
        whereOptions.langId = options.langId
      }

      if ('notified' in options) {
        whereOptions.notified = options.notified
      }

      if ('taken' in options) {
        whereOptions.taken = options.taken
      }

      if (date.now) {
        this.logger.info(`Schedule by now: ${date.now}`, { data: true })
        return date.notExpired
          ? Schedule.query()
              .where(anticipatedStartDate, '<=', date.now)
              .orWhere(startDate, '<=', date.now)
              .andWhere(endDate, '>', date.now)
              .andWhere(whereOptions)
              .withGraphFetched(getAll)
              .select(clientAttributes)
              .skipUndefined()
          : Schedule.query()
              .where(anticipatedStartDate, '<=', date.now)
              .orWhere(startDate, '<=', date.now)
              .andWhere(endDate, '>', date.now)
              .andWhere(whereOptions)
              .select(clientAttributes)
              .withGraphFetched(getAll)
              .skipUndefined()
      }

      if (date.expire) {
        this.logger.info(`Schedule by expire: ${date.expire}`)

        return Schedule.query()
          .where(endDate, '<=', date.expire)
          .andWhere({ streaming: true })
          .withGraphFetched(getAll)
      }

      /**
       * @description
       * If userId options and langId options are present we should only fetch that.
       */
      return options
        ? Schedule.query()
            .where(startDate, '>', date.startDate)
            .andWhere(endDate, '<', date.endDate)
            .andWhere(whereOptions)
            .select(clientAttributes)
            .withGraphFetched(getAll)
            .skipUndefined()
        : Schedule.query()
            .where(startDate, '>', date.startDate)
            .andWhere(endDate, '<', date.endDate)
            .select(clientAttributes)
            .withGraphFetched(getAll)
            .skipUndefined()
    }

    return Schedule.query()
      .withGraphFetched(getAll)
      .where(options)
      .select(clientAttributes)
  }

  /**
   * @param {Source} schedule
   * @returns {Promise<Schedule>}
   */
  @Bind
  getOne(schedule) {
    const { getAll } = this[relationShip]

    return Schedule.query()
      .findOne(schedule)
      .withGraphFetched(getAll)
      .skipUndefined()
  }

  /**
   * @param {Source} schedule
   * @returns {Promise<Schedule>}
   */
  updateOne(schedule) {
    if (schedule.id) {
      return Schedule.query().patchAndFetchById(schedule.id, {
        ...schedule
      })
    }

    return Schedule.query().patchAndFetch(schedule)
  }

  /**
   * @param {Source} schedule
   */
  @Bind
  deleteBy({ expire, ...options }) {
    const { endDate } = this.props

    if (expire) {
      return Schedule.query()
        .delete()
        .where(endDate, '<', expire)
        .andWhere(options)
    }
  }

  /**
   * @param {Source} source
   * @returns {Promise<Schedule>}
   */
  async expireClassRoomAndUpdate(source) {
    const transaction = await Schedule.knex().transaction(async trx => {
      try {
        const schedule = await Schedule.query(trx)
          .patchAndFetchById(source.id, {
            streaming: false
          })
          .withGraphFetched({ classes: true })

        this.logger.debug('expire', schedule)

        if (schedule.classes) {
          const classroom = await Classes.query(trx).patchAndFetchById(
            schedule.classes.id,
            {
              expired: true
            }
          )

          return {
            classroom,
            schedule
          }
        }

        return {
          schedule
        }
      } catch (err) {
        this.logger.error('expireClassRoomTransaction', err)

        throw new Error(err)
      }
    })

    return transaction
  }

  /**
   * @param {number} user
   */
  @Bind
  async getStream(user) {
    return Meetings.query()
      .withGraphFetched({
        classes: {
          schedule: {
            $modify: ['stream']
          }
        }
      })
      .where({ userId: user })
  }
}

export { ScheduleService }

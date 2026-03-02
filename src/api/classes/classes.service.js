import Classes from './classes.model'
import Package from 'api/packages/packages.model'
import Schedule from 'api/schedule/schedule.model'
import Meeting from 'api/meetings/meetings.model'
import { Bind } from 'decorators'

/**
 * @typedef {Object} Source
 * @property {{ id: number }} schedule
 * @property {{ id: number }} package
 */
const relationShip = Symbol('relationShip')

export class ClassesService {
  constructor() {
    this[relationShip] = {
      getOne: {
        meetings: {
          $modify: ['withData']
        },
        schedule: {
          $modify: ['withClass']
        }
      },
      getAll: {
        graph: '[meetings, schedule.[teacher(withName)]]',
        foreignKeyUser: 'meetings.userId',
        foreignKeyTeacher: 'schedule.userId'
      },
      count: {
        graph: 'schedule',
        foreignKey: 'schedule.userId'
      }
    }
    this.clientAttributes = ['expired', 'name', 'id']
  }
  /**
   * @param {Source} classInstance
   * @returns {Promise<Classes>}
   */
  async create(classInstance) {
    const trx = await Classes.knex().transaction(async trx => {
      try {
        /**
         * Substracting a class from the package.
         */
        const pack = await Package.query(trx).patchAndFetchById(
          classInstance.package.id,
          {
            classes: classInstance.package.classes - 1
          }
        )

        /**
         * Making schedule to "taken" status.
         */
        const schedule = await Schedule.query(trx)
          .patchAndFetchById(classInstance.schedule.id, {
            taken: true
          })
          .withGraphFetched({
            teacher: {
              $modify: ['withName']
            }
          })

        /**
         * Creating a class with the respective user.
         */
        const room = await Classes.query(trx).insertAndFetch({
          scheduleId: classInstance.schedule.id,
          name: classInstance.name
        })

        /**
         * Creating an instance for the room of the current user.
         */
        const meeting = await Meeting.query(trx).insertAndFetch({
          classId: room.id,
          userId: classInstance.user.id,
          timezone: classInstance.timezone
        })

        return {
          room,
          package: pack,
          meeting,
          schedule
        }
      } catch (err) {
        return {
          error: true,
          stack: err.stack
        }
      }
    })

    return trx
  }

  /**
   * @param {{ id: number, name?: string }} classInstance
   */
  @Bind
  getOne(classInstance) {
    const { getOne } = this[relationShip]

    if (classInstance.id) {
      return Classes.query().findById(classInstance.id)
    }

    return Classes.query()
      .select(this.clientAttributes)
      .findOne(classInstance)
      .withGraphFetched(getOne)
  }

  /**
   *
   * @param {{ user: number, expired?: boolean, limit?: number }}
   */
  @Bind
  getAll({ user, teacher, expired, limit, ...props }) {
    const { getAll, count } = this[relationShip]

    if (props.count) {
      return Classes.query()
        .withGraphJoined(count.graph)
        .where('classes.expired', true)
        .andWhere(count.foreignKey, props.options.teacherId)
    }

    if (limit) {
      return Classes.query()
        .withGraphJoined(getAll.graph)
        .where({ expired })
        .limit(limit)
        .andWhere(getAll.foreignKeyUser, user)
        .modifiers(getAll.modifiers)
        .orderBy('createdAt', 'DESC')
    }

    return user
      ? Classes.query()
          .withGraphJoined(getAll.graph)
          .where({ expired })
          .andWhere(getAll.foreignKeyUser, user)
          .modifiers(getAll.modifiers)
      : Classes.query()
          .withGraphJoined(getAll.graph)
          .where({ expired })
          .andWhere(getAll.foreignKeyTeacher, teacher)
          .modifiers(getAll.modifiers)
  }
}

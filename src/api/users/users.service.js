import User from './users.model'
import DeletedUser from 'api/deleted-users/deletedUsers.model'
import CloudStorage from 'api/cloudstorage/cloudstorage.model'
import DeletedCloudStorage from 'api/deleted-cloudstorage/deletedCloudstorage.model'
import { Roles } from 'metadata/roles'
import { ConfigService } from 'api/config/config.service'
import { RolesService } from 'api/roles/roles.services'
import { Logger } from 'api/logger'
import { transaction } from 'objection'

import moment from 'moment'
import knex from 'config/db'

/**
 * @typedef {Object} Source
 * @property {number} id
 * @property {string} email
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} imageUrl
 * @property {boolean} isVerified
 * @property {number} roleId
 * @property {number} page
 */

export class UsersService {
  constructor() {
    this.configService = new ConfigService()
    this.rolesService = new RolesService()
    this.logger = Logger.Service
    this.relationShip = {
      getAll: {
        role: {
          $relation: 'roles'
        }
      },
      getOne: {
        role: {
          $relation: 'roles',
          $modify: ['name']
        },
        model: {
          $relation : 'model',
          $modify: ['clientAttributes']
        }
      }
    }
    this.clientAttributes = [
      'email',
      'firstName',
      'lastName',
      'id',
      'imageUrl',
      'isVerified',
      'createdAt',
      'updatedAt',
      'lastLogin'
    ]
    this.create = this.create.bind(this)
    this.getAll = this.getAll.bind(this)
    this.getOne = this.getOne.bind(this)
    this.updateOne = this.updateOne.bind(this)
    this.isAvailable = this.isAvailable.bind(this)
  }

  /**
   * @param {Source} user
   * @returns {Promise<User>}
   */
  create(user) {
    const { getOne } = this.relationShip

    return User.query().insertAndFetch(user).withGraphFetched(getOne)
  }

  /**
   * @param {Source} users
   * @param {string | null} query
   * @returns {Promise<User []>}
   */
  getAll({ page, limit: withLimit, ...options }, query) {
    const { getAll } = this.relationShip

    const limit = withLimit
      ? withLimit
      : this.configService.provider.PAGINATION_LIMIT

    if (query) {
      return User.query()
        .page(page - 1, limit)
        .select(this.clientAttributes)
        .where({ roleId: options.roleId })
        .andWhere(function () {
          this.where('email', 'like', `%${query}%`)
        })
        .withGraphFetched(getAll)
    }

    if (page) {
      return User.query()
        .select(this.clientAttributes)
        .where({ roleId: options.roleId })
        .page(page - 1, limit)
        .withGraphFetched(getAll)
    }

    return User.query()
      .select(this.clientAttributes)
      .where(options)
      .withGraphFetched(getAll)
  }

  /**
   * @param {Source} user
   * @returns {Promise<User>}
   */
  getOne({ id, allowPrivateData, identity, ...options }) {
    const { getOne } = this.relationShip

    const clientAttributes = allowPrivateData
      ? ['password', ...this.clientAttributes]
      : this.clientAttributes

    if (id) {
      return User.query()
        .findById(id)
        .select(clientAttributes)
        .withGraphFetched(getOne)
    }

    if (identity) {
      return User.query().findOne(options).select(['imageUrl', 'firstName'])
    }

    return User.query()
      .findOne(options)
      .select(clientAttributes)
      .withGraphFetched(getOne)
  }

  /**
   *
   * @param {Source} user
   * @returns {Promise<Boolean>}
   */
  isAvailable({ email }) {
    return User.query().findOne({ email }).select(['email'])
  }

  /**
   * @param {Source} user
   * @returns {Promise<User>}
   */
  updateOne({ id, ...data }) {
    const { getOne } = this.relationShip

    if (id) {
      return User.query()
        .select(this.clientAttributes)
        .patchAndFetchById(id, data)
        .withGraphFetched(getOne)
    }

    return User.query()
      .select(this.clientAttributes)
      .patchAndFetch(data)
      .withGraphFetched(getOne)
  }

  /**
   * @returns {Promise<Number>}
   */
  async deleteInactive() {
    const threeMonthsAgo = moment().subtract(3, 'month').format('YYYY-MM-DD')
    const role = await this.rolesService.findOne({ name: Roles.User })

    const inactiveUsers = await User.query()
      .where('roleId', role.id)
      .where('lastLogin', '<', threeMonthsAgo)

    let total = 0

    for (const user of inactiveUsers) {
      try {
        await transaction(
          User,
          DeletedUser,
          CloudStorage,
          DeletedCloudStorage,
          async (User, DeletedUser, CloudStorage, DeletedCloudStorage) => {
            const deletedUser = await DeletedUser.query().findOne({
              email: user.email
            })

            if (deletedUser) {
              await DeletedUser.query().patchAndFetchById(deletedUser.id, {
                userId: Math.min(user.id, deletedUser.userId),
                firstName: user.firstName,
                lastName: user.lastName,
                updatedAt: knex.fn.now()
              })

              const cloudstorage = await CloudStorage.query().where({
                userId: user.id
              })

              for (const speaking of cloudstorage) {
                await DeletedCloudStorage.query().insert(speaking)
              }

              await User.query().deleteById(user.id)
              return
            }

            await DeletedUser.query().insert({
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            })

            const cloudstorage = await CloudStorage.query().where({
              userId: user.id
            })

            for (const speaking of cloudstorage) {
              await DeletedCloudStorage.query().insert(speaking)
            }

            await User.query().deleteById(user.id)
          }
        )
        total++
      } catch (error) {
        this.logger.error(error.name)
        this.logger.error(error.stack)
        continue
      }
    }

    return total
  }

  /**
   * @returns {Promise<Number>}
   */
  async verifyUnverified() {
    return User.query()
      .patch({ isVerified: true })
      .where('isVerified', '=', false)
  }

  /**
   * @param {string | number}
   */
  async getUserTour({ id }) {
    return User.query().select(['tour']).findById(id)
  }

  /**
   * @param {string | number} id
   * @returns {Promise<Number>} Affected rows
   */
  updateLastLogin(id) {
    return User.query()
      .findById(id)
      .patch({
        lastLogin: moment().format('YYYY-MM-DD')
      })
  }
}

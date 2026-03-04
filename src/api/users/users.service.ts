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
import type { UserRelationshipConfig, UserGetAllParams, UserGetOneParams } from './users.types'

export class UsersService {
  private configService: ConfigService
  private rolesService: RolesService
  private logger: typeof Logger.Service
  private relationShip: UserRelationshipConfig
  private clientAttributes: string[]

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

  create(user: Record<string, unknown>) {
    const { getOne } = this.relationShip

    return User.query().insertAndFetch(user).withGraphFetched(getOne)
  }

  getAll({ page, limit: withLimit, ...options }: UserGetAllParams, query?: string | null) {
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

  getOne({ id, allowPrivateData, identity, ...options }: UserGetOneParams) {
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

  isAvailable({ email }: { email: string }) {
    return User.query().findOne({ email }).select(['email'])
  }

  updateOne({ id, ...data }: { id?: number; [key: string]: unknown }) {
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

  async deleteInactive(): Promise<number> {
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
          async (BoundUser, BoundDeletedUser, BoundCloudStorage, BoundDeletedCloudStorage) => {
            const deletedUser = await BoundDeletedUser.query().findOne({
              email: user.email
            })

            if (deletedUser) {
              await BoundDeletedUser.query().patchAndFetchById(deletedUser.id, {
                userId: Math.min(user.id, (deletedUser as unknown as Record<string, number>).userId),
                firstName: user.firstName,
                lastName: user.lastName,
                updatedAt: knex.fn.now()
              } as unknown as Record<string, unknown>)

              const cloudstorage = await BoundCloudStorage.query().where({
                userId: user.id
              })

              for (const speaking of cloudstorage) {
                await BoundDeletedCloudStorage.query().insert(speaking as unknown as Record<string, unknown>)
              }

              await BoundUser.query().deleteById(user.id)
              return
            }

            await BoundDeletedUser.query().insert({
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            } as unknown as Record<string, unknown>)

            const cloudstorage = await BoundCloudStorage.query().where({
              userId: user.id
            })

            for (const speaking of cloudstorage) {
              await BoundDeletedCloudStorage.query().insert(speaking as unknown as Record<string, unknown>)
            }

            await BoundUser.query().deleteById(user.id)
          }
        )
        total++
      } catch (error) {
        this.logger.error((error as Error).name)
        this.logger.error((error as Error).stack)
        continue
      }
    }

    return total
  }

  async verifyUnverified() {
    return User.query()
      .patch({ isVerified: true })
      .where('isVerified', '=', false)
  }

  async getUserTour({ id }: { id: number }) {
    return User.query().select(['tour']).findById(id)
  }

  updateLastLogin(id: number) {
    return User.query()
      .findById(id)
      .patch({
        lastLogin: moment().format('YYYY-MM-DD')
      })
  }
}

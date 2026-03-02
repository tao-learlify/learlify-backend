import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { AuthenticationService } from 'api/authentication/authentication.service'
import { UsersService } from './users.service'
import { ConfigService } from 'api/config/config.service'
import { RolesService } from 'api/roles/roles.services'
import { NotFoundException } from 'exceptions'
import { createPaginationStack } from 'functions'

class UsersController {
  constructor() {
    this.authService = new AuthenticationService()
    this.configService = new ConfigService()
    this.rolesService = new RolesService()
    this.usersService = new UsersService()
    this.logger = Logger.Service
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
    const { search, page, limit } = req.query

    const role = await this.rolesService.findOne({ name: req.query.role })

    if (role) {
      const users = await this.usersService.getAll(
        { page, limit, roleId: role.id },
        search
      )

      return res.status(200).json({
        message: 'Users obtained succesfully',
        response: users.results,
        pagination: createPaginationStack({
          limit: this.configService.provider.PAGINATION_LIMIT,
          page: page,
          total: users.total
        }),
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.Role Not Found'))
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getOne(req, res, next) {
    if (req.query.tour) {
      return next()
    }

    const id = req.params.id

    const user = await this.usersService.getOne({ id })

    if (user) {
      return res.status(200).json({
        message: 'User obtained successfully',
        response: user,
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.User Not Found'))
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async updateOne(req, res) {
    /**
     * @type {{ email: string, firstName: string, lastName: string, password?: string }}
     */
    const { email, ...data } = req.body

    this.logger.info('email', { email })

    const user = req.user

    const available = await this.usersService.isAvailable({
      email: user.email
    })

    if (available) {
      data.password &&
        Object.assign(data, {
          password: await this.authService.hash(data.password)
        })

      const update = await this.usersService.updateOne({
        ...data,
        id: user.id
      })

      const token = this.authService.encrypt(
        { ...update, role: update.role },
        { clientConfig: true }
      )

      return res.status(200).json({
        message: 'Updated succesfully',
        response: {
          token
        },
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.User Not Found'))
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async updateTour(req, res) {
    const { draft } = req.body

    const { id } = req.user

    const data = await this.usersService.getUserTour({ id })

    const tour = JSON.parse(data.tour)

    tour[draft] = true

    await this.usersService.updateOne({
      id,
      tour: JSON.stringify(tour)
    })

    return res.status(200).json({
      response: {
        completed: true
      },
      statusCode: 200
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getTour(req, res) {
    const { id } = req.user

    const { tour } = await this.usersService.getUserTour({ id })

    return res.status(200).json({
      response: JSON.parse(tour),
      statusCode: 200
    })
  }
}

export { UsersController }

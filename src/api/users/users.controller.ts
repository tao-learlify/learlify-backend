import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { AuthenticationService } from 'api/authentication/authentication.service'
import { UsersService } from './users.service'
import { ConfigService } from 'api/config/config.service'
import { RolesService } from 'api/roles/roles.services'
import { NotFoundException } from 'exceptions'
import { createPaginationStack } from 'functions'
import type { Request, Response, NextFunction } from 'express'

class UsersController {
  private authService: AuthenticationService
  private configService: ConfigService
  private rolesService: RolesService
  private usersService: UsersService
  private logger: typeof Logger.Service

  constructor() {
    this.authService = new AuthenticationService()
    this.configService = new ConfigService()
    this.rolesService = new RolesService()
    this.usersService = new UsersService()
    this.logger = Logger.Service
  }

  @Bind
  async getAll(req: Request, res: Response): Promise<Response> {
    const { search, page, limit } = req.query

    const role = await this.rolesService.findOne({ name: req.query.role as string })

    if (role) {
      const users = await this.usersService.getAll(
        { page, limit, roleId: role.id } as unknown as Parameters<typeof this.usersService.getAll>[0],
        search as string
      )

      return res.status(200).json({
        message: 'Users obtained succesfully',
        response: (users as unknown as Record<string, unknown>).results,
        pagination: createPaginationStack({
          limit: this.configService.provider.PAGINATION_LIMIT,
          page: page,
          total: (users as unknown as Record<string, unknown>).total
        } as unknown as Parameters<typeof createPaginationStack>[0]),
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.Role Not Found'))
  }

  @Bind
  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.query.tour) {
      return next()
    }

    const id = req.params.id

    const user = await this.usersService.getOne({ id } as unknown as Parameters<typeof this.usersService.getOne>[0])

    if (user) {
      res.status(200).json({
        message: 'User obtained successfully',
        response: user,
        statusCode: 200
      })
      return
    }

    throw new NotFoundException(res.__('errors.User Not Found'))
  }

  @Bind
  async updateOne(req: Request, res: Response): Promise<Response> {
    const { email, ...data } = req.body

    this.logger.info('email', { email })

    const user = req.user!

    const available = await this.usersService.isAvailable({
      email: user.email
    })

    if (available) {
      (data as Record<string, unknown>).password &&
        Object.assign(data, {
          password: await this.authService.hash((data as Record<string, unknown>).password as string)
        })

      const update = await this.usersService.updateOne({
        ...data,
        id: user.id
      })

      const token = this.authService.encrypt(
        { ...(update as unknown as Record<string, unknown>), role: (update as unknown as Record<string, unknown>).role },
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

  @Bind
  async updateTour(req: Request, res: Response): Promise<Response> {
    const { draft } = req.body

    const { id } = req.user!

    const data = await this.usersService.getUserTour({ id })

    const tour = JSON.parse((data as unknown as Record<string, string>).tour)

    tour[draft as string] = true

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

  @Bind
  async getTour(req: Request, res: Response): Promise<Response> {
    const { id } = req.user!

    const result = await this.usersService.getUserTour({ id })

    return res.status(200).json({
      response: JSON.parse((result as unknown as Record<string, string>).tour),
      statusCode: 200
    })
  }
}

export { UsersController }

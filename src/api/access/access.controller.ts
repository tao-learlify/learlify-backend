import type { Request, Response } from 'express'
import type { CreateAccessInput, UpdateAccessInput } from './access.types'
import { Bind } from 'decorators'
import { AuthenticationService } from 'api/authentication/authentication.service'
import { AccessService } from './access.service'
import { ConfigService } from 'api/config/config.service'
import { RolesService } from 'api/roles/roles.services'
import { NotFoundException } from 'exceptions'

export class AccessController {
  private authService: AuthenticationService
  private configService: ConfigService
  private rolesService: RolesService
  private accessService: AccessService

  constructor() {
    this.authService = new AuthenticationService()
    this.configService = new ConfigService()
    this.rolesService = new RolesService()
    this.accessService = new AccessService()
  }

  @Bind
  async create(req: Request, res: Response): Promise<void> {
    const { planId, feature } = req.body as CreateAccessInput
    const access = await this.accessService.create({ planId, feature })

    res.status(200).json({
      message: 'Access create succesfully',
      response: access,
      statusCode: 201
    })
  }

  @Bind
  async getAll(_req: Request, res: Response): Promise<void> {
    const access = await this.accessService.getAll()

    res.status(200).json({
      message: 'Access obtained succesfully',
      response: access,
      statusCode: 200
    })
  }

  @Bind
  async getOne(req: Request, res: Response): Promise<void> {
    const access = await this.accessService.getOne(Number(req.params.id))

    if (access) {
      res.status(200).json({
        message: 'Access obtained successfully',
        response: access,
        statusCode: 200
      })

      return
    }

    throw new NotFoundException('Access Not Found')
  }

  @Bind
  async updateOne(req: Request, res: Response): Promise<void> {
    const { id, ...data } = req.body as UpdateAccessInput
    const updated = await this.accessService.updateOne(Number(id), data as Record<string, unknown>)

    res.status(200).json({
      message: 'Updated succesfully',
      response: updated,
      statusCode: 200
    })
  }
}

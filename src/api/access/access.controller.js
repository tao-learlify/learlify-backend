import { Bind } from 'decorators'
import { AuthenticationService } from 'api/authentication/authentication.service'
import { AccessService } from './access.service'
import { ConfigService } from 'api/config/config.service'
import { RolesService } from 'api/roles/roles.services'
import { NotFoundException } from 'exceptions'

export class AccessController {
  constructor() {
    this.authService = new AuthenticationService()
    this.configService = new ConfigService()
    this.rolesService = new RolesService()
    this.accessService = new AccessService()
  }

  @Bind
  async create(req, res) {
    const { planId, feature } = req.body
    const access = await this.accessService.create({ planId, feature })

    res.status(200).json({
      message: 'Access create succesfully',
      response: access,
      statusCode: 201
    })
  }

  @Bind
  async getAll(req, res) {
    const access = await this.accessService.getAll()

    res.status(200).json({
      message: 'Access obtained succesfully',
      response: access,
      statusCode: 200
    })
  }

  @Bind
  async getOne(req, res) {
    const access = await this.accessService.getOne(req.params.id)

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
  async updateOne(req, res) {
    const { id, ...data } = req.body
    const updated = await this.accessService.updateOne(id, data)

    res.status(200).json({
      message: 'Updated succesfully',
      response: updated,
      statusCode: 200
    })
  }
}

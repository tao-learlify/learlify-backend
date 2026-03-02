import { Bind } from 'decorators'
import { RolesService } from './roles.services'

export class RolesController {
  constructor() {
    this.rolesService = new RolesService()
  }

  /**
   * @param {import ('express').Request} _req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(_req, res) {
    const roles = await this.rolesService.getAll()

    return res.status(200).json({
      message: 'Roles obtained succesfully',
      response: roles,
      statusCode: 200
    })
  }
}

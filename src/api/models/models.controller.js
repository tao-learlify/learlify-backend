import { Bind } from 'decorators'
import { ModelsService } from './models.service'
import { NotFoundException } from 'exceptions'
import { UsersService } from 'api/users/users.service'
import { Logger } from 'api/logger'
import { AuthenticationService } from 'api/authentication/authentication.service'

import demo from 'metadata/demo'

class ModelsController {
  constructor() {
    this.auth = new AuthenticationService()
    this.models = new ModelsService()
    this.users = new UsersService()
    this.logger = Logger.Service
  }

  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {Function} next
   */
  @Bind
  async getAll(req, res, next) {
    if (req.query?.name) {
      return next()
    }

    const models = await this.models.getAll()

    return res.json({
      response: models,
      statusCode: 200
    })
  }

  @Bind
  async getOne(req, res) {
    const model = await this.models.getOne({
      name: req.query.name
    })

    if (model) {
      return res.json({
        response: model,
        statusCode: 200
      })
    }

    throw new NotFoundException('Model Not Found')
  }
  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {Function} next
   */
  @Bind
  async patch(req, res) {
    const { name } = req.query

    const model = await this.models.getOne({
      name
    })

    if (demo.isDemoUser(req.user.email)) {
      return res.status(200).json({
        response: {
          token: this.auth.encrypt(
            { ...req.user, isVerified: true, model },
            { clientConfig: true }
          )
        },
        statusCode: 200
      })
    }

    if (model) {
      const update = await this.users.updateOne({
        id: req.user.id,
        modelId: model.id
      })

      this.logger.info(`model ${model.name}`)

      this.logger.info(`update ${update.email}`)

      return res.status(200).json({
        response: {
          token: this.auth.encrypt({ ...update, model }, { clientConfig: true })
        },
        statusCode: 200
      })
    }

    throw new NotFoundException('Model Not Found')
  }
}

export { ModelsController }

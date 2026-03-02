import { Bind } from 'decorators'
import { AdvanceService } from './advance.service'
import { PlansService } from 'api/plans/plans.service'
import { PackagesService } from 'api/packages/packages.service'
import { NotFoundException, PaymentException } from 'exceptions'
import { Logger } from 'api/logger'
import feature from 'api/access/access.features'

export class AdvanceController {
  constructor() {
    this.defaultContent = {}
    this.advanceService = new AdvanceService()
    this.plansService = new PlansService()
    this.packagesService = new PackagesService()
    this.logger = Logger.Service
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async create(req, res) {
    const user = req.user

    const data = req.body

    const advance = await this.advanceService.create({
      ...data,
      content: this.defaultContent,
      userId: user.id
    })

    return res.json({
      message: 'Advance has been created',
      response: advance,
      statusCode: 200
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
    const user = req.user

    const advance = await this.advanceService.getOne({
      courseId: req.query.courseId,
      userId: user.id
    })

    const isSubscribed = await this.packagesService.getSubscriptions(
      {
        isActive: true,
        userId: user.id
      },
      [feature.COURSES]
    )

    if (isSubscribed) {
      if (advance) {
        return res.status(200).json({
          message: 'Advance obtained succesfully',
          response: advance,
          statusCode: 200
        })
      }

      throw new NotFoundException(res.__('errors.Advance Not Found'))
    }

    this.logger.warn('Requires Payment')

    throw new PaymentException()
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async updateOne(req, res) {
    const user = req.user

    const data = req.body

    const advance = await this.advanceService.getOne({
      courseId: data.courseId,
      userId: user.id
    })

    if (advance) {
      const { content } = advance

      if (data.completed) {
        Object.assign(content, {
          [data.unit]: {
            completed: content[data.unit] && content[data.unit].completed ? true : data.completed,
            general: data.last,
            last: true
          }
        })
      } else {
        Object.assign(content, {
          [data.unit]: {
            completed: content[data.unit] ? content[data.unit].completed : false,
            general: data.last,
            last: true
          }
        })
      }

      Object.keys(content).forEach(key => {
        if (key !== data.unit.toString()) {
          Object.assign(content, {
            [key]: {
              ...content[key],
              last: false
            }
          })
        }
      })

      const update = await this.advanceService.updateOne({
        id: advance.id,
        content
      })

      return res.json({
        response: update,
        statusCode: 201
      })
    }

    throw new NotFoundException(res.__('errors.Advance Not Found'))
  }
}

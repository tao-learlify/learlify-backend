import { ExamsService } from './exams.service'
import { PackagesService } from 'api/packages/packages.service'
import { NotFoundException, PaymentException } from 'exceptions'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { ModelsService } from 'api/models/models.service'
import feature from 'api/access/access.features'

class ExamsController {
  constructor() {
    this.exams = new ExamsService()
    this.packages = new PackagesService()
    this.models = new ModelsService()
    this.logger = Logger.Service
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
    const user = req.user

    const model = await this.models.getOne({ name: req.query.model })

    if (model) {
      const packages = await this.packages.getAll({
        isActive: true,
        userId: user.id,
        modelId: model.id
      })

      const isAllowedToPresentExams = packages.filter(pack => {
        return pack.plan.access.find(access => access.feature === feature.EXAMS)
      })

      const exams = await this.exams.getAll({ modelId: model.id })

      /**
       * @decription
       * Blocking access to exams
       */
      if (isAllowedToPresentExams.length === 0) {
        const blocked = exams.map(exam => {
          if (exam.requiresPayment) {
            return Object.assign(exam, {
              blocked: true
            })
          } else {
            return exam
          }
        })
        
        return res.json({
          response: blocked,
          statusCode: 200
        })
      } 

      return res.status(200).json({
        response: exams,
        statusCode: 200
      })
    }

    throw new NotFoundException('Model Not Found')
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Respocvfnse} res
   */
  @Bind
  async findOne(req, res) {
    const user = req.user

    const { id } = req.params

    const cloudResource = await this.exams.findCloudS3Resource({
      id
    })

    const { examModelId, requiresPayment } = await this.exams.getOne({
      id,
      withoutGraph: true
    })

    if (cloudResource) {
      if (requiresPayment) {
        const packages = await this.packages.getAll({
          isActive: true,
          userId: user.id,
          modelId: examModelId
        })

        /**
         * @description
         * Checking that the user can present exams with his access.
         */
        const isAllowedToPresentExams = packages.filter(pack =>
          pack.plan.access.find(access => access.feature === feature.EXAMS)
        )

        if (packages.length > 0 && isAllowedToPresentExams.length > 0) {
          return res.json({
            message: 'Exam obtained succesfully',
            response: cloudResource,
            statusCode: 200
          })
        }

        throw new PaymentException(
          res.__('errors.Unsuccessful response due to payment requirements')
        )
      }

      return res.json({
        message: 'Exam obtained succesfully',
        response: cloudResource,
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.Exam Not Found'))
  }
}

export { ExamsController }

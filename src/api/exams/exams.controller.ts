import type { Request, Response } from 'express'
import { ExamsService } from './exams.service'
import { PackagesService } from 'api/packages/packages.service'
import { NotFoundException, PaymentException } from 'exceptions'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { ModelsService } from 'api/models/models.service'
import feature from 'api/access/access.features'

class ExamsController {
  private exams: ExamsService
  private packages: PackagesService
  private models: ModelsService
  private logger: typeof Logger.Service

  constructor() {
    this.exams = new ExamsService()
    this.packages = new PackagesService()
    this.models = new ModelsService()
    this.logger = Logger.Service
  }

  @Bind
  async getAll(req: Request, res: Response): Promise<Response> {
    const user = req.user!

    const model = await this.models.getOne({ name: req.query.model as string })

    if (model) {
      const packages = await this.packages.getAll({
        isActive: true,
        userId: user.id,
        modelId: (model as unknown as Record<string, unknown>).id as number
      })

      const isAllowedToPresentExams = (packages as unknown as Record<string, unknown>[]).filter((pack: Record<string, unknown>) => {
        return ((pack.plan as Record<string, unknown>).access as Record<string, unknown>[]).find((access: Record<string, unknown>) => access.feature === feature.EXAMS)
      })

      const exams = await this.exams.getAll({ modelId: (model as unknown as Record<string, unknown>).id as number })

      if (isAllowedToPresentExams.length === 0) {
        const blocked = (exams as unknown as Record<string, unknown>[]).map((exam: Record<string, unknown>) => {
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

  @Bind
  async findOne(req: Request, res: Response): Promise<Response> {
    const user = req.user!

    const { id } = req.params

    const cloudResource = await this.exams.findCloudS3Resource({
      id: Number(id)
    })

    const examResult = await this.exams.getOne({
      id: Number(id),
      withoutGraph: true
    }) as unknown as Record<string, unknown>

    const { examModelId, requiresPayment } = examResult

    if (cloudResource) {
      if (requiresPayment) {
        const packages = await this.packages.getAll({
          isActive: true,
          userId: user.id,
          modelId: examModelId as number
        })

        const isAllowedToPresentExams = (packages as unknown as Record<string, unknown>[]).filter((pack: Record<string, unknown>) =>
          ((pack.plan as Record<string, unknown>).access as Record<string, unknown>[]).find((access: Record<string, unknown>) => access.feature === feature.EXAMS)
        )

        if (packages.length > 0 && isAllowedToPresentExams.length > 0) {
          return res.json({
            message: 'Exam obtained succesfully',
            response: cloudResource,
            statusCode: 200
          })
        }

        throw new PaymentException(
          res.__('errors.Unsuccessful response due to payment requirements') as unknown as { response?: unknown }
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

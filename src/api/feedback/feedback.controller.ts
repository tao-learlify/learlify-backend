import type { Request, Response } from 'express'
import { Bind } from 'decorators'
import { AmazonWebServices } from 'api/aws/aws.service'
import { ProgressService } from 'api/progress/progress.service'
import { CategoriesService } from 'api/categories/categories.service'
import { ModelsService } from 'api/models/models.service'
import { CloudStorageService } from 'api/cloudstorage/cloudstorage.service'
import { StatsService } from 'api/stats/stats.service'
import { NotFoundException, PaymentException } from 'exceptions'
import { cloudfrontURL, parseContent } from 'functions'
import { EvaluationsService } from 'api/evaluations/evaluations.services'
import { PackagesService } from 'api/packages/packages.service'

import { Logger } from 'api/logger'

import { Categories } from 'metadata/categories'
import { Models } from 'metadata/models'
import feature from 'api/access/access.features'
import type { FeedbackGetOneQuery } from './feedback.types'

class FeedbackController {
  private categoriesService: CategoriesService
  private cloudStorageService: CloudStorageService
  private evaluationsService: EvaluationsService
  private modelsService: ModelsService
  private progressService: ProgressService
  private statsService: StatsService
  private packagesService: PackagesService
  private aws: AmazonWebServices
  private logger: typeof Logger.Service

  constructor() {
    this.categoriesService = new CategoriesService()
    this.cloudStorageService = new CloudStorageService()
    this.evaluationsService = new EvaluationsService()
    this.modelsService = new ModelsService()
    this.progressService = new ProgressService()
    this.statsService = new StatsService()
    this.packagesService = new PackagesService()
    this.aws = new AmazonWebServices()
    this.logger = Logger.Service
  }

  @Bind
  async getOne(req: Request, res: Response): Promise<Response> {
    const { categoryId, examId, model: name, ignore } = req.query as unknown as FeedbackGetOneQuery

    const user = req.user!

    const progress = await this.progressService.getOne({
      examId,
      userId: user.id
    } as unknown as Parameters<typeof this.progressService.getOne>[0])

    if (progress) {
      const { dir } = (progress as unknown as Record<string, unknown>).exam as Record<string, unknown>

      const body = await this.aws.getObjectBody({
        Bucket: process.env.AWS_BUCKET,
        Key: cloudfrontURL(dir as string)
      })

      const category = await this.categoriesService.getOne({
        id: categoryId as unknown as string
      })

      const model = await this.modelsService.getOne({
        name
      })

      if (category && model) {
        const isSubscribed = await this.packagesService.getSubscriptions(
          {
            isActive: true,
            userId: user.id,
            modelId: (model as unknown as Record<string, unknown>).id as number
          },
          [feature.EXAMS, feature.EVALUATIONS]
        )

        const { data } = progress as unknown as Record<string, unknown>

        const { exercises } = parseContent({
          data: (body as unknown as Record<string, unknown>).toString() as unknown as JSON,
          key: (category as unknown as Record<string, unknown>).name as string
        } as unknown as Parameters<typeof parseContent>[0])

        const ref = (data as Record<string, unknown>)[(category as unknown as Record<string, unknown>).name as string] as Record<string, unknown>

        ignore && Object.assign(ref, { completed: true })

        const isContextEvaluation =
          (category as unknown as Record<string, unknown>).name === Categories.Speaking ||
          (category as unknown as Record<string, unknown>).name === Categories.Writing

        if (isContextEvaluation && ref.completed) {
          if (isSubscribed === false) {
            throw new PaymentException()
          }

          const cloudStorageRef = ref.cloudStorageRef as unknown[] | undefined

          if (cloudStorageRef) {
            const flattenCloudStorage = (cloudStorageRef as unknown[][]).flat().map((ref: unknown) => {
              return this.cloudStorageService.findOne({
                id: ref as number
              })
            })

            const evaluation = await this.evaluationsService.findOne({
              categoryId: (category as unknown as Record<string, unknown>).id as number,
              examId: examId,
              userId: user.id,
              early: true
            })

            this.logger.info('evaluation', evaluation)

            const cloudStorage = await Promise.all(flattenCloudStorage)

            return res.json({
              response: {
                id: (progress as unknown as Record<string, unknown>).id,
                cloudStorage,
                exercises,
                progress: {
                  ...(data as Record<string, unknown>)[(category as unknown as Record<string, unknown>).name as string] as Record<string, unknown>
                },
                evaluation
              },
              statusCode: 200
            })
          }

          const evaluation = await this.evaluationsService.findOne({
            categoryId: (category as unknown as Record<string, unknown>).id as number,
            examId: examId,
            userId: user.id,
            early: true
          })

          return res.json({
            response: {
              id: (progress as unknown as Record<string, unknown>).id,
              exercises,
              progress: {
                ...(data as Record<string, unknown>)[(category as unknown as Record<string, unknown>).name as string] as Record<string, unknown>
              },
              evaluation
            },
            statusCode: 200
          })
        }

        this.logger.info('Is completed?', { completed: ref.completed })

        if (ref.completed) {
          const isSubscribed = await this.packagesService.getSubscriptions(
            {
              isActive: true,
              userId: user.id,
              modelId: (model as unknown as Record<string, unknown>).id as number
            },
            [feature.EXAMS]
          )

          if (isSubscribed === false) {
            throw new PaymentException()
          }

          const stats = await this.statsService.getOne({
            userId: user.id,
            categoryId: (category as unknown as Record<string, unknown>).id as number,
            examId: (progress as unknown as Record<string, unknown>).exam as number
          }) as unknown as Record<string, unknown>

          const { exam } = stats as { exam?: { model?: { name: string } } }

          if (exam?.model?.name) {
            switch (exam.model.name) {
              case Models.APTIS:
                if ((category as unknown as Record<string, unknown>).name === Categories.Core) {
                  Object.assign(stats, { total: 50 })
                } else {
                  Object.assign(stats, { total: 25 })
                }
                break

              case Models.IELTS:
                Object.assign(stats, { total: 40 })
                break

              default:
                throw new NotFoundException(res.__('errors.Feedback Not Found'))
            }
          }

          this.logger.info('stats', stats)

          return res.json({
            response: {
              id: (progress as unknown as Record<string, unknown>).id,
              exercises,
              progress: {
                ...(data as Record<string, unknown>)[(category as unknown as Record<string, unknown>).name as string] as Record<string, unknown>
              },
              stats
            },
            statusCode: 200
          })
        }
        throw new NotFoundException(res.__('errors.Feedback Not Found'))
      }

      throw new NotFoundException(res.__('errors.Feedback Not Found'))
    }

    throw new NotFoundException(res.__('errors.Feedback Not Found'))
  }
}

export { FeedbackController }

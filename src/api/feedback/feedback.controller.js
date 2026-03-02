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

class FeedbackController {
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

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getOne(req, res) {
    const { categoryId, examId, model: name, ignore } = req.query

    const user = req.user

    /**
     * @description
     * Finding progress first.
     */
    const progress = await this.progressService.getOne({
      examId,
      userId: user.id
    })

    /**
     * @description
     * If progress exist we search for progress.
     */
    if (progress) {
      const { dir } = progress.exam

      const body = await this.aws.getObjectBody({
        Bucket: process.env.AWS_BUCKET,
        Key: cloudfrontURL(dir)
      })

      const category = await this.categoriesService.getOne({
        id: categoryId
      })

      const model = await this.modelsService.getOne({
        name
      })

      if (category && model) {
        const isSubscribed = await this.packagesService.getSubscriptions(
          {
            isActive: true,
            userId: user.id,
            modelId: model.id
          },
          [feature.EXAMS, feature.EVALUATIONS]
        )

        const { data } = progress

        const { exercises } = parseContent({
          data: body.toString(),
          key: category.name
        })

        const ref = data[category.name]

        ignore && Object.assign(ref, { completed: true })

        const isContextEvaluation =
          category.name === Categories.Speaking ||
          category.name === Categories.Writing

        if (isContextEvaluation && ref.completed) {
          if (isSubscribed === false) {
            throw new PaymentException()
          }

          const cloudStorageRef = ref.cloudStorageRef

          if (cloudStorageRef) {
            const flattenCloudStorage = cloudStorageRef.flat().map(ref => {
              return this.cloudStorageService.findOne({
                id: ref
              })
            })

            const evaluation = await this.evaluationsService.findOne({
              categoryId: category.id,
              examId: examId,
              userId: user.id,
              early: true
            })

            this.logger.info('evaluation', evaluation)

            const cloudStorage = await Promise.all(flattenCloudStorage)

            return res.json({
              response: {
                id: progress.id,
                cloudStorage,
                exercises,
                progress: {
                  ...data[category.name]
                },
                evaluation
              },
              statusCode: 200
            })
          }

          const evaluation = await this.evaluationsService.findOne({
            categoryId: category.id,
            examId: examId,
            userId: user.id,
            early: true
          })

          return res.json({
            response: {
              id: progress.id,
              exercises,
              progress: {
                ...data[category.name]
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
              modelId: model.id
            },
            [feature.EXAMS]
          )

          if (isSubscribed === false) {
            throw new PaymentException()
          }

          const stats = await this.statsService.getOne({
            userId: user.id,
            categoryId: category.id,
            examId: progress.exam.id
          })

          const { exam } = stats

          if (exam?.model?.name) {
            switch (exam.model.name) {
              case Models.APTIS:
                if (category.name === Categories.Core) {
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
              id: progress.id,
              exercises,
              progress: {
                ...data[category.name]
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

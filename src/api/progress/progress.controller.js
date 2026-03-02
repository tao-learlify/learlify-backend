import { Bind } from 'decorators'
import {
  ConflictException,
  NotFoundException,
  PaymentException,
  TransactionError
} from 'exceptions'
import { Logger } from 'api/logger'

import { StatsFunctions } from 'api/stats/stats.functions'
import { Categories } from 'metadata/categories'

import { AmazonWebServices } from 'api/aws/aws.service'
import { CategoriesService } from 'api/categories/categories.service'
import { ExamsService } from 'api/exams/exams.service'
import { EvaluationsService } from 'api/evaluations/evaluations.services'
import { PackagesService } from 'api/packages/packages.service'
import { PlansService } from 'api/plans/plans.service'
import { ProgressService } from './progress.service'

import { cloudfrontURL, parseContent } from 'functions'
import { v4 as UUID } from 'uuid'

class ProgressController {
  constructor() {
    this.aws = new AmazonWebServices()
    this.categoryService = new CategoriesService()
    this.packagesService = new PackagesService()
    this.progressService = new ProgressService()
    this.plansService = new PlansService()
    this.examsService = new ExamsService()
    this.evaluationsService = new EvaluationsService()
    this.logger = Logger.Service
  }

  get structure() {
    return {
      'Grammar & Vocabulary': {
        feedback: [],
        lastIndex: 0,
        points: 0,
        score: 0
      },
      Listening: {
        feedback: [],
        lastIndex: 0,
        points: 0,
        score: 0
      },
      Reading: {
        feedback: [],
        lastIndex: 0,
        points: 0,
        score: 0
      },
      Speaking: {
        cloudStorageRef: [],
        lastIndex: 0
      },
      Writing: {
        feedback: [],
        lastIndex: 0
      }
    }
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  @Bind
  async create(req, res) {
    const exists = await this.progressService.getOne({
      examId: req.body.examId,
      userId: req.user.id
    })

    if (exists) {
      this.logger.warning('Progress Conflict Already Exist')

      throw new ConflictException()
    }

    const progress = await this.progressService.create({
      examId: req.body.examId,
      userId: req.user.id,
      data: {
        uuid: UUID(),
        ...this.structure
      }
    })

    this.logger.info('progress', { created: true })

    res.status(201).json({
      message: 'Progress created successfully',
      response: progress,
      statusCode: 201
    })
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  @Bind
  async getOne(req, res) {
    const progress = await this.progressService.getOne({
      examId: req.query.examId,
      userId: req.user.id
    })

    if (progress) {
      return res.status(200).json({
        message: 'Progress obtained successfully',
        response: progress,
        statusCode: 200
      })
    }

    throw new NotFoundException()
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  @Bind
  async updateOne(req, res) {
    const { id, key, score, uuid, lastIndex, feedback, points } = req.body
    
    const name = decodeURIComponent(key)

    const category = await this.categoryService.getOne({
      name
    })

    const progress = await this.progressService.getOne({
      id
    })

    if (progress && category) {
      const { data } = progress

      /**
       * @description
       * This validation works for preventing hack our logical business.
       */
      if (data.uuid === uuid && name in data) {
        const { dir, model } = progress.exam

        const body = await this.aws.getObjectBody({
          Bucket: process.env.AWS_BUCKET,
          Key: cloudfrontURL(dir)
        })

        const { exercises } = parseContent({
          data: body.toString(),
          key: name
        })

        /**
         * @description
         * User requires feedback.
         */
        const requiresFeedback = exercises?.length === lastIndex
        
        this.logger.info('RequiresFeedback', requiresFeedback)

        /**
         * @description
         * With Static Service guaranteed to update based on his key.
         */
        if (key === Categories.Speaking || key === Categories.Writing) {
          const user = req.user

          const response = await this.progressService.createFeedbackTransaction(
            {
              ref: {
                package: {
                  userId: user.id,
                  isActive: true
                },
                user,
                category,
                progress,
                feedback,
                lastIndex,
                recordings: req.files,
                model
              },
              applySubscriptionDiscount: requiresFeedback
            }
          )

          if (response && response.requiresPayment) {
            this.logger.warn('Cannot be updated due to payment requirements')
            
            throw new PaymentException()
          } else if (response) {
            this.logger.info('progress', response)

            return res.status(201).json({
              response: {
                id: progress.id,
                ...response
              },
              statusCode: 201
            })
          }

          if (response.transactionError) {
            this.logger.error('error', response)

            throw new TransactionError()
          }
        } else {
          const sync = progress.data[category.name]

          sync.completed = requiresFeedback

          sync.lastIndex = lastIndex

          sync.score += score

          if (points) {
            sync.points = sync.points + points
          }

          this.logger.info('Progress Sync', sync)

          const transaction = await this.progressService.updateScoreWithProgress({
            context: requiresFeedback,
            data: progress,
            score: {
              ref: StatsFunctions.score({
                category: category.name,
                model: model.name,
                value: sync.score
              }),
              user: {
                categoryId: category.id,
                examId: progress.exam.id,
                userId: req.user.id,
              },
              email: req.user.email
            }
          })

          if (transaction.transactionError) {
            throw new TransactionError()
          }

          this.logger.info('updated', transaction)

          if (transaction.notification) {
            this.logger.info('Notification Sended')
          }

          return res.status(201).json({
            message: 'Progress Updated Successfully',
            response: {
              id: progress.id,
              ...transaction, 
              feedback: requiresFeedback
            },
            statusCode: 201
          })
        }
      }

      throw new NotFoundException('Resource Not Found, Must Be Key or Progress')
    }
    throw new NotFoundException('Resource Not Found, Must Be Key or Progress')
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async patchOne(req, res) {
    const name = req.query.category

    const category = await this.categoryService.getOne({
      name: decodeURIComponent(name)
    })

    if (category) {
      const progress = await this.progressService.getOne({
        id: req.query.id,
        userId: req.user.id
      })

      if (progress) {
        const data = progress.data

        /**
         * @description
         * Replacing his own context on the part.
         */
        data[category.name] = this.structure[category.name]

        await this.progressService.updateOne({
          id: req.query.id,
          data
        })

        return res.status(201).json({
          message: 'Patch Completed',
          response: data,
          statusCode: 201
        })
      }

      throw new NotFoundException('Progress Not Found')
    }

    throw new NotFoundException('Category Not Found')
  }
}

export { ProgressController }

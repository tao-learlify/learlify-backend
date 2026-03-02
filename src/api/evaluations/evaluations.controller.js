import { Bind, Injectable } from 'decorators'
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  TransactionError
} from 'exceptions'
import { CategoriesService } from 'api/categories/categories.service'
import { EvaluationsService } from './evaluations.services'
import { UsersService } from 'api/users/users.service'
import { ProgressService } from 'api/progress/progress.service'
import { MailService } from 'api/mails/mails.service'
import { ClassesService } from 'api/classes/classes.service'
import { ExamsService } from 'api/exams/exams.service'
import { NotificationsService } from 'api/notifications/notifications.service'
import { ModelsService } from 'api/models/models.service'

import STATUS, { EVALUATED, TAKEN } from './evaluations.status'
import { Categories } from 'metadata/categories'
import { Roles } from 'metadata/roles'
import { createPaginationStack } from 'functions'
import { StatsFunctions } from 'api/stats/stats.functions'
import { CloudStorageService } from 'api/cloudstorage/cloudstorage.service'
import { Models } from 'metadata/models'
@Injectable
class EvaluationsController {
  #comments

  constructor() {
    this.cloudStorage = new CloudStorageService()

    this.categoriesService = new CategoriesService()

    this.classesService = new ClassesService()

    this.examsService = new ExamsService()

    this.evaluationsService = new EvaluationsService()

    this.notificationsService = new NotificationsService()

    this.mailService = new MailService()

    this.progressService = new ProgressService()

    this.usersService = new UsersService()

    this.modelsService = new ModelsService()

    this.#comments = {
      html: '<div>Sin comentarios</div>',
      text: 'Sin comentarios'
    }
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async getOne(req, res) {
    const id = req.params.id

    const evaluation = await this.evaluationsService.findOne({
      id
    })

    /**
     * @description
     * Finding The version of the evaluation.
     */
    if (evaluation?.exam) {
      const exercises = await this.examsService.findCloudS3Resource(
        {
          id: evaluation.exam.id
        },
        evaluation.category.name
      )

      /**
       * @description
       * Finding refs from cloudStorage, to make audio recognized on the client.
       */
      if (evaluation.data.cloudStorageRef) {
        const ids = evaluation.data.cloudStorageRef

        for (const part in ids) {
          for (const speaking in ids[part]) {
            const data = await this.cloudStorage.findOne({
              id: ids[part][speaking]
            })

            ids[part][speaking] = data
          }
        }
      }
      const model = evaluation?.exam?.model?.name
      /**
       * @description
       * Adding front end required data to filled.
       */
      switch (evaluation.category.name) {
        case Categories.Writing:
          if (model === Models.APTIS) {
            /**
             * @description
             * Score from APTIS Speaking is based score array.
             */
            evaluation.score = exercises.exercises.map(value =>
              value.questions.map(() => 0)
            )
          }

          if (model === Models.IELTS) {
            /**
             * @description
             * Score from IELTS Speaking is based score array.
             */
            evaluation.score = exercises.exercises.map(value =>
              value.questions.map(() => 0)
            )
          }

          /**
           * @description
           * Creating comments
           */
          evaluation.comments = Array(evaluation.data.feedback.length).fill(
            this.#comments
          )
          break

        case Categories.Speaking:
          if (evaluation.exam.model.name === Models.APTIS) {
            /**
             * @description
             * Score from APTIS speaking is based score array.
             */
            evaluation.score = evaluation.data.cloudStorageRef.map(value =>
              [...value].fill(0)
            )
          }

          if (evaluation.exam.model.name === Models.IELTS) {
            /**
             * @description
             * Score from IELTS Speaking is based score array.
             */
            evaluation.score = evaluation.data.cloudStorageRef.map(() => [
              0,
              0,
              0,
              0
            ])
          }

          /**
           * @description
           * Creating comments
           */
          evaluation.comments = Array(
            evaluation.data.cloudStorageRef.length
          ).fill(this.#comments)

          break

        default:
          evaluation.score = []
          break
      }

      return res.status(200).json({
        message: 'Evaluation loaded succesfully',
        response: {
          ...evaluation,
          ...exercises
        },
        statusCode: 200
      })
    }

    if (evaluation) {
      return res.status(200).json({
        message: 'Evaluation loaded succesfully',
        response: evaluation,
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.Evaluation Not Found'))
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {import ('express').NextFunction} next
   */
  @Bind
  async getAll(req, res, next) {
    const page = req.query.page

    const user = req.user

    if (req.query.count) {
      return next()
    }

    if (user.role.name === Roles.User) {
      const model = await this.modelsService.getOne({ name: req.query.model })

      if (!model) {
        throw new NotFoundException('Model Not Found')
      }

      const { results, total } = await this.evaluationsService.getAll({
        userId: user.id,
        modelId: model.id,
        page,
        paginationLimit: 4
      })

      const paginationStack = {
        total,
        page,
        limit: 4
      }

      return res.status(200).json({
        response: results,
        pagination: createPaginationStack(paginationStack),
        statusCode: 200
      })
    }

    if (req.query.own) {
      if (req.query.user) {
        const { results, total } = await this.evaluationsService.getAll({
          teacherId: user.id,
          userId: req.query.user,
          page
        })

        const paginationStack = {
          total,
          page,
          limit: 10
        }

        return res.status(200).json({
          response: results,
          pagination: createPaginationStack(paginationStack),
          statusCode: 200
        })
      }

      const { results, total } = await this.evaluationsService.getAll({
        teacherId: user.id,
        page
      })

      const paginationStack = {
        total,
        page,
        limit: 10
      }

      return res.status(200).json({
        response: results,
        pagination: createPaginationStack(paginationStack),
        statusCode: 200
      })
    }

    const properties = {
      page
    }

    req.query.user &&
      Object.assign(properties, {
        userId: req.query.user
      })

    const { results, total } = await this.evaluationsService.getAll(properties)

    const paginationStack = {
      total,
      page,
      limit: 10
    }

    return res.status(200).json({
      response: results,
      pagination: createPaginationStack(paginationStack),
      statusCode: 200
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getCount(req, res) {
    const teacher = req.user

    /**
     * @description
     * Parallel request, for catching all counts from speakings and writings.
     */
    const [speaking, writing] = await Promise.all([
      this.categoriesService.getOne({ name: Categories.Speaking }),
      this.categoriesService.getOne({ name: Categories.Writing })
    ])

    /**
     * @description
     * Parallel request, for getting data from the count service.
     */
    const [countSpeaking, countWriting, countClasses] = await Promise.all([
      this.evaluationsService.getAll({
        count: true,
        options: {
          teacherId: teacher.id,
          categoryId: speaking.id
        }
      }),
      this.evaluationsService.getAll({
        count: true,
        options: {
          teacherId: teacher.id,
          categoryId: writing.id
        }
      }),
      this.classesService.getAll({
        count: true,
        options: {
          teacherId: teacher.id
        }
      })
    ])

    const initialIndex = 0

    /**
     * Destructuring assignament.
     */
    const classes = countClasses.length

    const speakings =
      countSpeaking.length > 0 ? countSpeaking[initialIndex].count : 0

    const writings =
      countWriting.length > 0 ? countWriting[initialIndex].count : 0

    return res.status(200).json({
      message: 'Count obtainted succesfully',
      response: {
        classes,
        speakings,
        writings
      },
      statusCode: 200
    })
  }

  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async updateOne(req, res) {
    const user = req.user

    const { id } = req.params

    const { status, score, comments } = req.body

    /**
     * @description
     * If score is presented and it's evaluated we need to following this execution.
     * We need first get the marking or bandScore.
     */
    if (score && status === EVALUATED) {
      const evaluation = await this.evaluationsService.findOne({
        id
      })

      if (evaluation.status === STATUS.EVALUATED) {
        throw new ConflictException('Evaluation is already completed')
      }
      /**
       * @description
       * Checking that comments include his own structure.
       */
      const invalidPatternComment = !comments.every(
        comment => comment.html && comment.text
      )

      if (invalidPatternComment) {
        throw new BadRequestException('Comments should include HTML and Text')
      }

      if (evaluation) {
        /**
         * @description
         * Getting teacher score.
         */
        const stats = StatsFunctions.updateWithTeacherScore(score, {
          category: evaluation.category,
          model: evaluation.exam.model
        })

        /**
         * @description
         * Stats
         */
        const forStats = {
          categoryId: evaluation.category.id,
          examId: evaluation.exam.id,
          userId: evaluation.user.id,
          evaluationId: evaluation.id,
          ...stats
        }

        this.logger.info('score', stats)

        this.logger.info('forStats', forStats)

        /**
         * @description
         * Updating score and with stats.
         */
        const update = await this.evaluationsService.patchAndCreateResults(
          {
            id,
            data: {
              ...evaluation.data,
              comments
            }
          },
          forStats
        )

        if (update.transactionError) {
          throw new TransactionError('Cannot be updated')
        }

        return res.status(200).json({
          message: 'Stats and Evaluation has been created',
          response: update,
          statusCode: 200
        })
      }

      throw new NotFoundException('Evaluation Not Found')
    }

    /**
     * @description
     * If STATUS is Taken, that we mean that the field should include teacherId.
     */
    const evaluation = await this.evaluationsService.update({
      id,
      status,
      teacherId: status === TAKEN ? user.id : null
    })

    if (evaluation) {
      return res.status(201).json({
        message: 'Updated succesfully',
        response: evaluation,
        statusCode: 201
      })
    }

    throw new NotFoundException('Evaluation Not Found')
  }

  /**
   * @param {Express.Request} req
   * @param {Express.Response} res
   */
  @Bind
  async patchOne(req, res) {
    const { id } = req.params

    const evaluation = await this.evaluationsService.findOne({
      id
    })

    if (evaluation && evaluation.status === STATUS.EVALUATED) {
      const evaluation = await this.evaluationsService.update({
        id,
        status: STATUS.TAKEN
      })

      return res.json({
        response: evaluation,
        statusCode: 200
      })
    }

    throw new NotFoundException('Evaluation Update')
  }
}

export { EvaluationsController }

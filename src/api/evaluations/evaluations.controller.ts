import type { Request, Response, NextFunction } from 'express'
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
import type { EvaluationComment } from './evaluations.types'

@Injectable
class EvaluationsController {
  #comments: EvaluationComment

  private cloudStorage: CloudStorageService
  private categoriesService: CategoriesService
  private classesService: ClassesService
  private examsService: ExamsService
  private evaluationsService: EvaluationsService
  private notificationsService: NotificationsService
  private mailService: MailService
  private progressService: ProgressService
  private usersService: UsersService
  private modelsService: ModelsService
  declare private logger: Record<string, (...args: unknown[]) => void>

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

  @Bind
  async getOne(req: Request, res: Response): Promise<Response> {
    const id = req.params.id

    const evaluation = await this.evaluationsService.findOne({
      id: Number(id)
    }) as unknown as Record<string, unknown> | undefined

    if (evaluation?.exam) {
      const exam = evaluation.exam as Record<string, unknown>
      const category = evaluation.category as Record<string, unknown>
      const data = evaluation.data as Record<string, unknown>

      const exercises = await this.examsService.findCloudS3Resource(
        {
          id: exam.id as number
        },
        category.name as string
      )

      if (data.cloudStorageRef) {
        const ids = data.cloudStorageRef as Record<string, Record<string, unknown>>

        for (const part in ids) {
          for (const speaking in ids[part]) {
            const cloudData = await this.cloudStorage.findOne({
              id: ids[part][speaking] as number
            })

            ids[part][speaking] = cloudData
          }
        }
      }
      const model = (exam?.model as Record<string, unknown>)?.name
      const exercisesResult = exercises as Record<string, unknown>

      switch (category.name) {
        case Categories.Writing:
          if (model === Models.APTIS) {
            (evaluation as Record<string, unknown>).score = (exercisesResult.exercises as Record<string, unknown>[]).map((value: Record<string, unknown>) =>
              (value.questions as unknown[]).map(() => 0)
            )
          }

          if (model === Models.IELTS) {
            (evaluation as Record<string, unknown>).score = (exercisesResult.exercises as Record<string, unknown>[]).map((value: Record<string, unknown>) =>
              (value.questions as unknown[]).map(() => 0)
            )
          }

          (evaluation as Record<string, unknown>).comments = Array((data.feedback as unknown[]).length).fill(
            this.#comments
          )
          break

        case Categories.Speaking:
          if ((exam.model as Record<string, unknown>).name === Models.APTIS) {
            (evaluation as Record<string, unknown>).score = (data.cloudStorageRef as unknown[]).map((value: unknown) =>
              [...(value as unknown[])].fill(0)
            )
          }

          if ((exam.model as Record<string, unknown>).name === Models.IELTS) {
            (evaluation as Record<string, unknown>).score = (data.cloudStorageRef as unknown[]).map(() => [
              0,
              0,
              0,
              0
            ])
          }

          (evaluation as Record<string, unknown>).comments = Array(
            (data.cloudStorageRef as unknown[]).length
          ).fill(this.#comments)

          break

        default:
          (evaluation as Record<string, unknown>).score = []
          break
      }

      return res.status(200).json({
        message: 'Evaluation loaded succesfully',
        response: {
          ...evaluation,
          ...exercisesResult
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

  @Bind
  async getAll(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    const page = req.query.page as unknown as number

    const user = req.user!

    if (req.query.count) {
      return next()
    }

    if ((user.role as unknown as Record<string, unknown>).name === Roles.User) {
      const model = await this.modelsService.getOne({ name: req.query.model as string })

      if (!model) {
        throw new NotFoundException('Model Not Found')
      }

      const { results, total } = await this.evaluationsService.getAll({
        userId: user.id,
        modelId: (model as unknown as Record<string, unknown>).id as number,
        page,
        paginationLimit: 4
      }) as unknown as { results: unknown[]; total: number }

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
          userId: req.query.user as unknown as number,
          page
        }) as unknown as { results: unknown[]; total: number }

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
      }) as unknown as { results: unknown[]; total: number }

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

    const properties: Record<string, unknown> = {
      page
    }

    req.query.user &&
      Object.assign(properties, {
        userId: req.query.user
      })

    const { results, total } = await this.evaluationsService.getAll(properties as unknown as { page: number }) as unknown as { results: unknown[]; total: number }

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

  @Bind
  async getCount(req: Request, res: Response): Promise<Response> {
    const teacher = req.user!

    const [speaking, writing] = await Promise.all([
      this.categoriesService.getOne({ name: Categories.Speaking }),
      this.categoriesService.getOne({ name: Categories.Writing })
    ])

    const [countSpeaking, countWriting, countClasses] = await Promise.all([
      this.evaluationsService.getAll({
        count: true,
        options: {
          teacherId: teacher.id,
          categoryId: (speaking as unknown as Record<string, unknown>).id
        },
        page: 1
      }),
      this.evaluationsService.getAll({
        count: true,
        options: {
          teacherId: teacher.id,
          categoryId: (writing as unknown as Record<string, unknown>).id
        },
        page: 1
      }),
      this.classesService.getAll({
        count: true,
        options: {
          teacherId: teacher.id
        }
      } as unknown as Parameters<typeof this.classesService.getAll>[0])
    ]) as unknown as [Record<string, unknown>[], Record<string, unknown>[], unknown[]]

    const initialIndex = 0

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

  @Bind
  async updateOne(req: Request, res: Response): Promise<Response> {
    const user = req.user!

    const { id } = req.params

    const { status, score, comments } = req.body

    if (score && status === EVALUATED) {
      const evaluation = await this.evaluationsService.findOne({
        id: Number(id)
      }) as unknown as Record<string, unknown>

      if ((evaluation as Record<string, unknown>).status === STATUS.EVALUATED) {
        throw new ConflictException('Evaluation is already completed')
      }

      const invalidPatternComment = !comments.every(
        (comment: Record<string, unknown>) => comment.html && comment.text
      )

      if (invalidPatternComment) {
        throw new BadRequestException('Comments should include HTML and Text')
      }

      if (evaluation) {
        const evaluationCategory = evaluation.category as Record<string, unknown>
        const evaluationExam = evaluation.exam as Record<string, unknown>
        const evaluationUser = evaluation.user as Record<string, unknown>
        const evaluationData = evaluation.data as Record<string, unknown>

        const stats = StatsFunctions.updateWithTeacherScore(score, {
          category: evaluationCategory as { name: string },
          model: evaluationExam.model as { name: string }
        }) as unknown as Record<string, unknown>

        const forStats = {
          categoryId: evaluationCategory.id,
          examId: evaluationExam.id,
          userId: evaluationUser.id,
          evaluationId: evaluation.id,
          ...stats
        }

        this.logger.info('score', stats)

        this.logger.info('forStats', forStats)

        const update = await this.evaluationsService.patchAndCreateResults(
          {
            id: Number(id),
            data: {
              ...evaluationData,
              comments
            }
          },
          forStats as Record<string, unknown>
        ) as unknown as Record<string, unknown>

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

    const evaluation = await this.evaluationsService.update({
      id: Number(id),
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

  @Bind
  async patchOne(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    const evaluation = await this.evaluationsService.findOne({
      id: Number(id)
    }) as unknown as Record<string, unknown> | undefined

    if (evaluation && evaluation.status === STATUS.EVALUATED) {
      const evaluation = await this.evaluationsService.update({
        id: Number(id),
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

import type { Request, Response } from 'express'
import { Bind, Injectable } from 'decorators'
import { NotFoundException } from 'exceptions'
import { CategoriesService } from 'api/categories/categories.service'
import { LatestEvaluationsService } from './latestEvaluations.service'
import { UsersService } from 'api/users/users.service'
import { ProgressService } from 'api/progress/progress.service'
import { MailService } from 'api/mails/mails.service'
import { ClassesService } from 'api/classes/classes.service'

import { Categories } from 'metadata/categories'
import { createPaginationStack } from 'functions'

@Injectable
class LatestEvaluationsController {
  #limit: number

  private evaluationsService: LatestEvaluationsService
  private categoriesService: CategoriesService
  private usersService: UsersService
  private classesService: ClassesService
  private progressService: ProgressService
  private mailService: MailService
  declare private logger: unknown
  declare private config: unknown

  constructor() {
    this.evaluationsService = new LatestEvaluationsService()
    this.categoriesService = new CategoriesService()
    this.usersService = new UsersService()
    this.classesService = new ClassesService()
    this.progressService = new ProgressService()
    this.mailService = new MailService()
    this.#limit = 4
  }

  @Bind
  async getOne(req: Request, res: Response): Promise<void> {
    const id = req.params.id
    const evaluation = await this.evaluationsService.getOne(Number(id))

    if (evaluation) {
      res.status(200).json({
        message: 'Evaluation loaded successfully',
        response: evaluation,
        statusCode: 200
      })
      return
    }

    throw new NotFoundException(res.__('errors.Evaluation Not Found'))
  }

  @Bind
  async getAll(req: Request, res: Response): Promise<Response> {
    const page = req.query.page as unknown as number
    const user = req.user!

    if (req.query.own) {
      const { results, total } = await this.evaluationsService.getAll({
        teacherId: user.id,
        page
      }) as unknown as { results: Record<string, unknown>[]; total: number }

      const paginationStack = {
        total,
        page,
        limit: 10
      }

      res.status(200).json({
        response: results,
        pagination: createPaginationStack(paginationStack),
        statusCode: 200
      })
      return res
    }

    const { results, total } = await this.evaluationsService.getAll({
      page,
      limit: this.#limit,
      userId: user.id
    }) as unknown as { results: Record<string, unknown>[]; total: number }

    const mapToMarking = results.map(({ data }) => {
      const typedData = data as Record<string, Record<string, unknown>[]>
      return {
        writings: typedData.writings.map(writing => writing.critery),
        speakings: typedData.speakings.map(speakings => speakings.critery)
      }
    })

    const paginationStack = {
      total,
      page,
      limit: this.#limit
    }

    return res.status(200).json({
      mapToMarking,
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

    const [speakings, writings, countClasses] = await Promise.all([
      this.evaluationsService.count({
        teacherId: teacher.id,
        categoryId: (speaking as unknown as Record<string, unknown>).id as number
      }),
      this.evaluationsService.count({
        teacherId: teacher.id,
        categoryId: (writing as unknown as Record<string, unknown>).id as number
      }),
      this.classesService.getAll({
        count: true,
        options: {
          teacherId: teacher.id
        }
      } as unknown as Parameters<typeof this.classesService.getAll>[0])
    ])

    const classes = (countClasses as unknown as unknown[]).length

    return res.status(200).json({
      message: 'Count obtained successfully',
      response: {
        classes,
        speakings,
        writings
      },
      statusCode: 200
    })
  }
}

export { LatestEvaluationsController }

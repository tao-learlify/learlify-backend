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
  #limit

  constructor() {
    this.evaluationsService = new LatestEvaluationsService()
    this.categoriesService = new CategoriesService()
    this.usersService = new UsersService()
    this.classesService = new ClassesService()
    this.progressService = new ProgressService()
    this.mailService = new MailService()
    this.#limit = 4
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async getOne(req, res) {
    const id = req.params.id
    const evaluation = await this.evaluationsService.getOne(id)

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

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {import ('express').NextFunction} next
   */
  @Bind
  async getAll(req, res) {
    const page = req.query.page
    const user = req.user

    if (req.query.own) {
      const { results, total } = await this.evaluationsService.getAll({
        teacherId: user.id,
        page
      })

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
      return
    }

    const { results, total } = await this.evaluationsService.getAll({
      page,
      limit: this.#limit,
      userId: user.id
    })

    const mapToMarking = results.map(({ data }) => {
      return {
        writings: data.writings.map(writing => writing.critery),
        speakings: data.speakings.map(speakings => speakings.critery)
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
    const [speakings, writings, countClasses] = await Promise.all([
      this.evaluationsService.count({
        teacherId: teacher.id,
        categoryId: speaking.id
      }),
      this.evaluationsService.count({
        teacherId: teacher.id,
        categoryId: writing.id
      }),
      this.classesService.getAll({
        count: true,
        options: {
          teacherId: teacher.id
        }
      })
    ])

    const classes = countClasses.length

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

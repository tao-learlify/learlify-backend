import { StatsFunctions } from './stats.functions'
import { StatsService } from './stats.service'
import { ExamsService } from 'api/exams/exams.service'
import { ModelsService } from 'api/models/models.service'
import { CategoriesService } from 'api/categories/categories.service'
import { NotFoundException } from 'exceptions'
import { ProgressService } from 'api/progress/progress.service'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { Categories } from 'metadata/categories'
import { Models } from 'metadata/models'
import type { Request, Response } from 'express'

class StatsController {
  private statsService: StatsService
  private examsService: ExamsService
  private categoriesService: CategoriesService
  private progressService: ProgressService
  private modelService: ModelsService
  private logger: typeof Logger.Service

  constructor() {
    this.statsService = new StatsService()
    this.examsService = new ExamsService()
    this.categoriesService = new CategoriesService()
    this.progressService = new ProgressService()
    this.modelService = new ModelsService()
    this.logger = Logger.Service
  }

  @Bind
  async getAll(req: Request, res: Response): Promise<Response> {
    const model = await this.modelService.getOne({
      name: req.query.model
    })

    if (model) {
      this.logger.info('Model', model.name)

      const ids = await this.examsService.getAll({
        modelId: model.id,
        getIds: true
      })

      const categories = await Promise.all(
        [
          Categories.Core,
          Categories.Listening,
          Categories.Reading,
          Categories.Writing,
          Categories.Speaking
        ].map(name =>
          this.categoriesService.getOne({
            name
          })
        )
      )

      let data: (string | undefined)[] = []

      for (const id in ids) {
        const stats = await Promise.all(
          categories.map(category =>
            this.statsService.getAll(
              {
                examId: (ids as unknown as Record<string, unknown>[])[id],
                userId: req.user!.id,
                categoryId: (category as unknown as Record<string, unknown>).id
              },
              { model: model.name }
            )
          )
        )

        ;(data as unknown[])[id] = stats.flat()
      }

      data = (data as unknown as Record<string, unknown>[][]).map(keys => {
        const output = keys.reduce((accumulator: number, stats: Record<string, unknown>) => {
          switch (model.name) {
            case Models.APTIS:
              return accumulator + (stats.points as number)

            case Models.IELTS:
              return (accumulator += stats.bandScore as number)
          }
          return accumulator
        }, 0)

        return StatsFunctions.getDataScore(
          model as unknown as { name: string },
          output / keys.length,
          (categories[0] as unknown as Record<string, unknown>).name as string
        )
      })

      return res.status(200).json({
        response: {
          chart: {
            labels: (ids as unknown[]).map(StatsFunctions.transformIdToIndex),
            datasets: [
              {
                label: 'General',
                data: data
              }
            ]
          },
          labels: StatsFunctions.getLabels(model as unknown as { name: string })
        },
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.Model Not Found'))
  }
}

export { StatsController }

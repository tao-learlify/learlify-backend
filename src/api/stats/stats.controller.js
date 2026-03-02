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

class StatsController {
  constructor() {
    this.statsService = new StatsService()
    this.examsService = new ExamsService()
    this.categoriesService = new CategoriesService()
    this.progressService = new ProgressService()
    this.modelService = new ModelsService()
    this.logger = Logger.Service
  }
  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
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

      let data = []

      for (const id in ids) {
        const stats = await Promise.all(
          categories.map(category =>
            this.statsService.getAll(
              {
                examId: ids[id],
                userId: req.user.id,
                categoryId: category.id
              },
              { model: model.name }
            )
          )
        )

        data[id] = stats.flat()
      }

      data = data.map(keys => {
        const output = keys.reduce((accumulator, stats) => {
          switch (model.name) {
            case Models.APTIS:
              return accumulator + stats.points

            case Models.IELTS:
              return (accumulator += stats.bandScore)
          }
        }, 0)

        return StatsFunctions.getDataScore(
          model,
          output / keys.length,
          categories[0].name
        )
      })

      return res.status(200).json({
        response: {
          chart: {
            labels: ids.map(StatsFunctions.transformIdToIndex),
            datasets: [
              {
                label: 'General',
                data: data
              }
            ]
          },
          labels: StatsFunctions.getLabels(model)
        },
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.Model Not Found'))
  }
}

export { StatsController }

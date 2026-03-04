import 'dotenv/config'
import 'config/db'
import Exam from 'api/exams/exams.model'
import Model from 'api/models/models.model'

type ModelRow = {
  id: number
  name: string
}

type ExamRow = {
  id: number
}

const path = 'https://dkmwdxc6g4lk7.cloudfront.net/assets/svg'

async function script(): Promise<void> {
  const printer = globalThis.console
  try {
    const models = (await Model.query().select(['id', 'name'])) as unknown as ModelRow[]

    for (const model of models) {
      const exams = (await Exam.query().where({
        examModelId: model.id
      })) as unknown as ExamRow[]

      await Model.query().updateAndFetchById(model.id, {
        logo: `${path}/${model.name.toLowerCase()}.png`
      })

      for (const exam in exams) {
        const index = Number.parseInt(exam, 10) + 1

        await Exam.query().updateAndFetchById(exams[exam].id, {
          alternImageUrl: `${path}/o-${index}.svg`,
          imageUrl: `${path}/${index}.svg`,
          requiresPayment: Number.parseInt(exam, 10) !== 0
        })
      }
    }
  } catch (err: unknown) {
    printer.error(err)
  }

  process.exit()
}

script()

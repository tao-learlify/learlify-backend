import 'dotenv/config'
import 'config/db'
import data from './exports/data.json'
import LatestEvaluation from 'api/latest-evaluations/latestEvaluations.model'

type MergeDataEntry = {
  id: number
  score: string
}

type EvaluationWithData = {
  data: Record<string, unknown>
}

async function script(): Promise<void> {
  const printer = globalThis.console
  const SQL = LatestEvaluation.knex()
  const source = data as MergeDataEntry[]

  await SQL.transaction(async T => {
    try {
      for (const { id, score } of source) {
        const evaluation = (await LatestEvaluation.query(T).findById(
          id
        )) as unknown as EvaluationWithData

        await LatestEvaluation.query(T).updateAndFetchById(id, {
          data: Object.assign(evaluation.data, {
            score
          })
        })
      }
    } catch (err: unknown) {
      printer.log(err)
    }
  })

  process.exit()
}

script()

/* eslint-disable no-console */
import 'dotenv/config'
import 'config/db.js'
import data from './exports/data.json'
import LatestEvaluation from 'api/latest-evaluations/latestEvaluations.model'

async function script () {
  const SQL = LatestEvaluation.knex()
  
  await SQL.transaction(async T => {
    try {
      for (const { id, score } of data) {
        const evaluation = await LatestEvaluation.query(T).findById(id)

        await LatestEvaluation.query(T).updateAndFetchById(id, {
          data: Object.assign(evaluation.data, {
            score
          })
        })
      }
    } catch (err) {
      console.log(err)
    }
  })

  process.exit()
}

script()

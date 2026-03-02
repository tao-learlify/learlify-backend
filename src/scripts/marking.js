/* eslint-disable no-console */
import 'dotenv/config'
import 'config/db.js'
import { Model } from 'objection'
import fs from 'fs'
import path from 'path'

const thisPath = path.join(__dirname, 'exports')
class Results extends Model {
  static get tableName() {
    return 'results'
  }

  static get jsonAttributes() {
    return {
      type: 'object',

      properties: {
        marking: { type: 'string' }
      }
    }
  }
}

async function script() {
  const scope = []

  const SQL = Results.knex()

  const run = true

  await SQL.transaction(async T => {
    while (run) {
      try {
        const results = await Results.query(T)
          .whereNotNull('evaluationId')
          .select(['evaluationId', 'marking', 'id'])

        
        if (results.length === 0) {
          break
        }

        for (const result of results) {
          const content = {
            id: result.evaluationId,
            score: result.marking
          }
  
          await Results.query(T).updateAndFetchById(result.id, {
            evaluationId: null
          })
  
          scope.push(content)
        }
        
      } catch (err) {
        console.log('err', err)

        break
      }
    }

    return fs.writeFileSync(
      path.join(thisPath, 'data.json'),
      JSON.stringify(scope, null, 2),
      {
        encoding: 'utf-8'
      }
    )
  })
}

script()

import 'dotenv/config'
import 'config/db'
import { Model } from 'objection'
import fs from 'fs'
import path from 'path'

type ResultRow = {
  id: number
  evaluationId: number
  marking: unknown
}

type ScopeEntry = {
  id: number
  score: unknown
}

const thisPath = path.join(__dirname, 'exports')

class Results extends Model {
  static get tableName(): string {
    return 'results'
  }

  static get jsonAttributes(): string[] {
    return {
      type: 'object',

      properties: {
        marking: { type: 'string' }
      }
    } as unknown as string[]
  }
}

async function script(): Promise<void> {
  const printer = globalThis.console
  const scope: ScopeEntry[] = []

  const SQL = Results.knex()

  const run = true

  await SQL.transaction(async T => {
    while (run) {
      try {
        const results = (await Results.query(T)
          .whereNotNull('evaluationId')
          .select(['evaluationId', 'marking', 'id'])) as unknown as ResultRow[]

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
      } catch (err: unknown) {
        printer.log('err', err)

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

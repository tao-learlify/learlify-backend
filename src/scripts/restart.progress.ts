import 'dotenv/config'
import 'config/db'
import Progress from 'api/progress/progress.model'
import { v4 as UUID } from 'uuid'
import { Logger } from 'api/logger'

type InitialSectionDTO = {
  feedback?: unknown[]
  cloudStorageRef?: unknown[]
  lastIndex: number
  points?: number
  score?: number
}

type ProgressRowDTO = {
  id: number
}

const initialStructure: Record<string, InitialSectionDTO> = {
  'Grammar & Vocabulary': {
    feedback: [],
    lastIndex: 0,
    points: 0,
    score: 0
  },
  Listening: {
    feedback: [],
    lastIndex: 0,
    points: 0,
    score: 0
  },
  Reading: {
    feedback: [],
    lastIndex: 0,
    points: 0,
    score: 0
  },
  Speaking: {
    cloudStorageRef: [],
    lastIndex: 0
  },
  Writing: {
    feedback: [],
    lastIndex: 0
  }
}

const ROWS = ['id']

const LIMIT = 100

const updateScriptFunction = async (): Promise<void> => {
  const logger = Logger.Service

  const SQL = Progress.knex()

  await SQL.transaction(async transactionScope => {
    try {
      const offset = {
        current: 0
      }

      const inserting = true

      while (inserting) {
        const { results } = (await Progress.query(transactionScope)
          .select(ROWS)
          .page(offset.current++, LIMIT)) as unknown as { results: ProgressRowDTO[] }

        logger.debug('Wait for migration update', {
          updating: results.length > 0,
          page: offset.current
        })

        if (results.length > 0) {
          for (const { id } of results) {
            await Progress.query(transactionScope)
              .where({ id })
              .patch({
                data: Object.assign(initialStructure, {
                  uuid: UUID()
                })
              })
          }
        } else {
          break
        }
      }

      return []
    } catch (err: unknown) {
      const printer = globalThis.console
      const current = err as { name?: unknown; stack?: unknown }
      printer.log(current.name, current.stack)
    }
  })

  process.exit()
}

updateScriptFunction()

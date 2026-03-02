/* eslint-disable no-console */
import 'dotenv/config'
import 'config/db.js'
import Progress from 'api/progress/progress.model'
import { v4 as UUID } from 'uuid'
import { Logger } from 'api/logger'

const initialStructure = {
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
    lastIndex: 0,
  },
  Writing: {
    feedback: [],
    lastIndex: 0,
  }
}

/**
 * @description
 * Optimization.
 */
const ROWS = ['id']

const LIMIT = 100

const updateScriptFunction = async () => {
  const logger = Logger.Service

  const SQL = Progress.knex()

  await SQL.transaction(async transactionScope => {
    try {
      const offset = {
        current: 0
      }

      const inserting = true

      while (inserting) {
        const { results } = await Progress.query(transactionScope)
          .select(ROWS)
          .page(offset.current++, LIMIT)

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
    } catch (err) {
      console.log(err.name, err.stack)
    }
  })

  process.exit()
}

updateScriptFunction()

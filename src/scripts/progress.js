import 'dotenv/config'
import 'config/db.js'

import { v4 as UUID } from 'uuid'

import Evaluation from 'api/evaluations/evaluations.model'
import LatestEvaluation from 'api/latest-evaluations/latestEvaluations.model'
import Progress from 'api/progress/progress.model'

import { Logger } from 'api/logger'
import { Categories } from 'metadata/categories'

const logger = Logger.Service

const SQL = Evaluation.knex()

;(async () => {
  const run = true

  await SQL.transaction(async T => {
    while (run) {
      const rows = await Evaluation.query(T)
        .whereNotNull('data')
        .andWhere({ status: 'EVALUATED' })
        .withGraphFetched({ progress: true })

      if (rows.length === 0) {
        logger.warn('Breakpoint')

        break
      }

      for (const row of rows) {
        await Evaluation.query(T)
          .update({
            refVersion: null,
            data: null
          })
          .where({ id: row.id })

        logger.info('updated', { id: row.id })

        await Progress.query(T)
          .patch({
            data: {
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
          })
          .where({ id: row.progress.id })

        const writings = []

        const speakings = []

        row.data
          .filter(data => {
            if (Array.isArray(data.category)) {
              return (
                data.category[0].name === Categories.Speaking ||
                data.category[0].name === Categories.Writing
              )
            }
            return (
              data.category.name === Categories.Speaking ||
              data.category.name === Categories.Writing
            )
          })
          .filter(data => {
            if (data?.feedback?.answers && data.feedback.answers.length > 0) {
              return true
            }
            return false
          })
          .forEach(data => {
            if (data.category.name === Categories.Speaking) {
              const questions = data.questions.map(question => {
                let images = null

                if (typeof question.imageUrl === 'string') {
                  images = question.imageUrl.images
                }

                if (
                  typeof question.imageUrl === 'object' &&
                  question.imageUrl !== null
                ) {
                  images = question.imageUrl.images
                }

                return {
                  images,
                  title: question.title,
                  recordingUrl: question.recordingUrl
                }
              })

              const feedback = data.feedback.answers.map(answer => ({
                id: UUID(),
                recordingUrl: answer.key
              }))

              const critery = data.critey ?? []

              const description = data.description ?? 'Unavailable Description'


              speakings.push({
                description,
                critery,
                feedback,
                questions
              })
            }

            if (data.category.name === Categories.Writing) {
              const questions = data.questions.map(question => ({
                id: UUID(),
                title: question.title
              }))

              const feedback = data.feedback.answers.map(answer => ({
                id: UUID(),
                title: answer.title
              }))

              const critery = data.critery ?? []

              const description = data.description ?? 'Unavailable Description'

              writings.push({
                description,
                critery,
                questions,
                feedback
              })
            }

            if (
              Array.isArray(data.category) &&
              data.category[0].name === Categories.Speaking
            ) {
              const questions = data.questions.map(question => {
                let images = null

                if (typeof question.imageUrl === 'string') {
                  images = question.imageUrl.images
                }

                if (
                  typeof question.imageUrl === 'object' &&
                  question.imageUrl !== null
                ) {
                  images = question.imageUrl.images
                }

                return {
                  images,
                  title: question.title,
                  recordingUrl: question.recordingUrl
                }
              })

              const feedback = data.feedback.answers.map(answer => ({
                id: UUID(),
                recordingUrl: answer.key
              }))

              const critery = data.critery ?? []

              const description = data.description ?? 'Description Not Available'

              speakings.push({
                description,
                critery,
                feedback,
                questions
              })
            }

            if (
              Array.isArray(data.category) &&
              data.category[0].name === Categories.Writing
            ) {
              const questions = data.questions.map(question => ({
                id: UUID(),
                title: question.title
              }))

              const feedback = data.feedback.answers.map(answer => ({
                id: UUID(),
                title: answer.title
              }))

              const critery = data.critery ?? []

              const description = data.description ?? 'Description Not Available'

              writings.push({
                description,
                critery,
                questions,
                feedback
              })
            }
          })

        try {
          if (speakings.length > 0 || writings.length > 0) {
            const latest = await LatestEvaluation.query(T).insert({
              id: row.id,
              userId: row.userId,
              teacherId: row.teacherId,
              categoryId: row.categoryId,
              status: 'EVALUATED',
              data: {
                comments: row.comments,
                marking: row.marking,
                writings: writings,
                speakings: speakings
              }
            })

            logger.info('Created evaluation', {
              id: latest.id
            })
          }
        } catch (err) {
          logger.error(err)
          

          break
        }
      }
    }
  })
  process.exit()
})()

import 'dotenv/config'
import 'config/db'

import { v4 as UUID } from 'uuid'

import Evaluation from 'api/evaluations/evaluations.model'
import LatestEvaluation from 'api/latest-evaluations/latestEvaluations.model'
import Progress from 'api/progress/progress.model'

import { Logger } from 'api/logger'
import { Categories } from 'metadata/categories'

type EvaluationCategoryDTO = {
  name: string
}

type EvaluationFeedbackAnswerDTO = {
  key?: string
  title?: string
}

type EvaluationFeedbackDTO = {
  answers: EvaluationFeedbackAnswerDTO[]
}

type EvaluationQuestionDTO = {
  imageUrl?: unknown
  title?: string
  recordingUrl?: string
}

type EvaluationDataDTO = {
  category: EvaluationCategoryDTO | EvaluationCategoryDTO[]
  feedback?: EvaluationFeedbackDTO
  questions: EvaluationQuestionDTO[]
  critey?: unknown[]
  critery?: unknown[]
  description?: string
}

type EvaluationRowDTO = {
  id: number
  userId: number
  teacherId: number
  categoryId: number
  comments?: unknown
  marking?: unknown
  progress: {
    id: number
  }
  data: EvaluationDataDTO[]
}

type LatestEvaluationInsertDTO = {
  comments?: unknown
  marking?: unknown
  writings: Array<Record<string, unknown>>
  speakings: Array<Record<string, unknown>>
}

const logger = Logger.Service

const SQL = Evaluation.knex()

;(async (): Promise<void> => {
  const run = true

  await SQL.transaction(async T => {
    while (run) {
      const rows = (await Evaluation.query(T)
        .whereNotNull('data')
        .andWhere({ status: 'EVALUATED' })
        .withGraphFetched({ progress: true })) as unknown as EvaluationRowDTO[]

      if (rows.length === 0) {
        logger.warn('Breakpoint')

        break
      }

      for (const row of rows) {
        await Evaluation.query(T)
          .update({
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

        const writings: Array<Record<string, unknown>> = []

        const speakings: Array<Record<string, unknown>> = []

        row.data
          .filter((data: EvaluationDataDTO): boolean => {
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
          .filter((data: EvaluationDataDTO): boolean => {
            if (data?.feedback?.answers && data.feedback.answers.length > 0) {
              return true
            }
            return false
          })
          .forEach((data: EvaluationDataDTO): void => {
            if ((data.category as { name?: string }).name === Categories.Speaking) {
              const questions = data.questions.map((question: EvaluationQuestionDTO) => {
                let images: unknown = null

                if (typeof question.imageUrl === 'string') {
                  images = (question.imageUrl as unknown as { images?: unknown }).images
                }

                if (
                  typeof question.imageUrl === 'object' &&
                  question.imageUrl !== null
                ) {
                  images = (question.imageUrl as { images?: unknown }).images
                }

                return {
                  images,
                  title: question.title,
                  recordingUrl: question.recordingUrl
                }
              })

              const feedback = (data.feedback as EvaluationFeedbackDTO).answers.map(
                (answer: EvaluationFeedbackAnswerDTO) => ({
                  id: UUID(),
                  recordingUrl: answer.key
                })
              )

              const critery = data.critey ?? []

              const description = data.description ?? 'Unavailable Description'

              speakings.push({
                description,
                critery,
                feedback,
                questions
              })
            }

            if ((data.category as { name?: string }).name === Categories.Writing) {
              const questions = data.questions.map((question: EvaluationQuestionDTO) => ({
                id: UUID(),
                title: question.title
              }))

              const feedback = (data.feedback as EvaluationFeedbackDTO).answers.map(
                (answer: EvaluationFeedbackAnswerDTO) => ({
                  id: UUID(),
                  title: answer.title
                })
              )

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
              const questions = data.questions.map((question: EvaluationQuestionDTO) => {
                let images: unknown = null

                if (typeof question.imageUrl === 'string') {
                  images = (question.imageUrl as unknown as { images?: unknown }).images
                }

                if (
                  typeof question.imageUrl === 'object' &&
                  question.imageUrl !== null
                ) {
                  images = (question.imageUrl as { images?: unknown }).images
                }

                return {
                  images,
                  title: question.title,
                  recordingUrl: question.recordingUrl
                }
              })

              const feedback = (data.feedback as EvaluationFeedbackDTO).answers.map(
                (answer: EvaluationFeedbackAnswerDTO) => ({
                  id: UUID(),
                  recordingUrl: answer.key
                })
              )

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
              const questions = data.questions.map((question: EvaluationQuestionDTO) => ({
                id: UUID(),
                title: question.title
              }))

              const feedback = (data.feedback as EvaluationFeedbackDTO).answers.map(
                (answer: EvaluationFeedbackAnswerDTO) => ({
                  id: UUID(),
                  title: answer.title
                })
              )

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
            const evaluationData: LatestEvaluationInsertDTO = {
              comments: row.comments,
              marking: row.marking,
              writings: writings,
              speakings: speakings
            }

            const latest = await LatestEvaluation.query(T).insert({
              userId: row.userId,
              teacherId: row.teacherId,
              categoryId: row.categoryId,
              data: evaluationData
            })

            logger.info('Created evaluation', {
              id: latest.id
            })
          }
        } catch (err: unknown) {
          logger.error(err)

          break
        }
      }
    }
  })
  process.exit()
})()

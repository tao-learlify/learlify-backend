import { Categories } from 'metadata/categories'
import { Models } from 'metadata/models'
import type { FeedbackOutputInput } from './feedback.types'


class FeedbackFunctions {
  static output({ model, category, exercises }: FeedbackOutputInput): Record<string, unknown>[] | undefined {
    if (category === Categories.Writing) {
      switch (model) {
        case Models.IELTS:
          return exercises.map(exercise => ({
            ...exercise,
            questions: (exercise.questions as Record<string, unknown>[] | undefined)?.map(
              (question: Record<string, unknown>) => question.title
            )
          }))

        default:
          return []
      }
    }
  }
}


export { FeedbackFunctions }

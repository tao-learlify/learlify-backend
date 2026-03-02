import { Categories } from 'metadata/categories'
import { Models } from 'metadata/models'


class FeedbackFunctions {
  /**
   * @typedef {Object} FeedbackOutput
   * @property {string} category
   * @property {[]} exercises
   * @property {string} model
   * 
   * @param {FeedbackOutput}
   */
  static output ({ model, category, exercises }) {
    if (category === Categories.Writing) {
      switch (model) {
        case Models.IELTS:
          return exercises.map(exercise => ({
            ...exercise,
            questions: exercise.questions?.map(question => question.title)
          }))

        default:
          return []
      } 
    }
  }
}


export { FeedbackFunctions }
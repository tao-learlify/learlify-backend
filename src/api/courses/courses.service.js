import Advance from 'api/advance/advance.model'
import { Bind } from 'decorators'
import Course from './courses.model'

class CoursesService {
  /**
   * @param {string} modelName
   * @param {User} user
   */
  async getAll(modelName, user) {
    const courses = await Course.query()
      .withGraphJoined('[model(token), views(token)]')
      .where('model.name', modelName)

    for (const course of courses) {
      const advances = await Advance.query()
        .select(['createdAt', 'content', 'id'])
        .where({ userId: user.id, courseId: course.id })

      course.advances = advances
      
      delete course.order
      delete course.modelId
    }

    return courses
  }

  @Bind
  getOne({ id, ...options }) {
    if (id) {
      return Course.query().findById(id)
    }

    return Course.query().findOne(options)
  }
}

export { CoursesService }

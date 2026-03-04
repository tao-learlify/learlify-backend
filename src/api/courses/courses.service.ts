import type { CourseGetOneQuery } from './courses.types'
import Advance from 'api/advance/advance.model'
import { Bind } from 'decorators'
import Course from './courses.model'

class CoursesService {
  async getAll(modelName: string, user: { id: number }) {
    const courses = await Course.query()
      .withGraphJoined('[model(token), views(token)]')
      .where('model.name', modelName)

    for (const course of courses) {
      const advances = await Advance.query()
        .select(['createdAt', 'content', 'id'])
        .where({ userId: user.id, courseId: course.id })

      ;(course as unknown as Record<string, unknown>).advances = advances

      delete (course as unknown as Record<string, unknown>).order
      delete (course as unknown as Record<string, unknown>).modelId
    }

    return courses
  }

  @Bind
  getOne({ id, ...options }: CourseGetOneQuery) {
    if (id) {
      return Course.query().findById(id)
    }

    return Course.query().findOne(options)
  }
}

export { CoursesService }

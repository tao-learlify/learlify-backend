import { Bind, Injectable } from 'decorators'
import { AdvanceService } from 'api/advance/advance.service'
import { UsersService } from 'api/users/users.service'
import { CoursesService } from './courses.service'
import { PackagesService } from 'api/packages/packages.service'
import { PlansService } from 'api/plans/plans.service'
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
  PaymentException
} from 'exceptions'
import { ModelsService } from 'api/models/models.service'
import { AmazonWebServices } from 'api/aws/aws.service'
import { Logger } from 'api/logger'

@Injectable
class CoursesController {
  constructor() {
    this.aws = new AmazonWebServices()

    this.advance = new AdvanceService()

    this.courses = new CoursesService()

    this.packages = new PackagesService()

    this.plans = new PlansService()

    this.users = new UsersService()

    this.models = new ModelsService()

    this.logger = Logger.Service
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
    const query = req.query

    const user = req.user

    const model = await this.models.getOne({
      name: query.model
    })

    if (model) {
      const courses = await this.courses.getAll(model.name, user)

      const isSubscribed = await this.packages.getOne({
        access: 'COURSES',
        isActive: true,
        userId: user.id,
        modelId: model.id
      })


      const [course] = courses

      /**
       * @description
       * If user is having a subscription package, but not advance, that means that user receives and packages from admin.
       * We already pushing it for no problems.
       */
      if (isSubscribed?.isActive && course.advances.length === 0) {

        const content = await this.advance.create({
          content: {},
          courseId: course.id,
          userId: user.id
        })

        course.advances.push(content)
      }

      /**
       * @description
       * If user is subscribed, or it's having demo we already connect to the request.
       */
      if (isSubscribed || query.demo === true) {  
        const advance = courses.reduce((pv, cv) => [...pv, ...cv.advances], [])
    
        return res.json({
          message: 'Courses Obtained Successfully',
          response: {
            advance,
            courses
          },
          statusCode: 200
        })
      }

      throw new PaymentException()
    }

    throw new NotFoundException()
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async inscription(req, res) {
    const { courseId } = req.body

    const course = await this.courses.getOne({ id: courseId })

    this.logger.debug('course', course)

    if (!course) {
      throw new BadRequestException(
        res.__('errors.A course with the ID provided couldnt be found')
      )
    }

    const advance = await this.advance.getOne({
      userId: req.user.id,
      courseId: course.id
    })

    if (advance) {
      throw new ConflictException()
    }

    const ticket = await this.advance.create({
      userId: req.user.id,
      courseId: course.id,
      content: {}
    })
    
    this.logger.debug('ticket', ticket)

    if (!ticket) {
      throw new ConflictException()
    }

    return res.status(201).json({
      message: 'Inscription successfully created',
      response: ticket,
      statusCode: 201
    })
  }
}

export { CoursesController }

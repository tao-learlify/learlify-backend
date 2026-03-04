import type { Request, Response } from 'express'
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
  private aws: AmazonWebServices
  private advance: AdvanceService
  private courses: CoursesService
  private packages: PackagesService
  private plans: PlansService
  private users: UsersService
  private models: ModelsService
  private logger: typeof Logger.Service

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

  @Bind
  async getAll(req: Request, res: Response): Promise<Response> {
    const query = req.query as Record<string, unknown>

    const user = req.user!

    const model = await this.models.getOne({
      name: query.model
    })

    if (model) {
      const courses = await this.courses.getAll(model.name, user) as unknown as Record<string, unknown>[]

      const isSubscribed = await this.packages.getOne({
        access: 'COURSES',
        isActive: true,
        userId: user.id,
        modelId: model.id
      })

      const [course] = courses

      if ((isSubscribed as unknown as Record<string, unknown>)?.isActive && (course.advances as unknown[]).length === 0) {

        const content = await (this.advance as { create(data: unknown): Promise<unknown> }).create({
          content: {},
          courseId: course.id as number,
          userId: user.id
        })

        ;(course.advances as unknown[]).push(content)
      }

      if (isSubscribed || query.demo === true) {
        const advance = courses.reduce((pv: unknown[], cv) => [...pv, ...(cv.advances as unknown[])], [])

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

  @Bind
  async inscription(req: Request, res: Response): Promise<Response> {
    const { courseId } = req.body as { courseId: number }

    const course = await this.courses.getOne({ id: courseId })

    this.logger.debug('course', course)

    if (!course) {
      throw new BadRequestException(
        res.__('errors.A course with the ID provided couldnt be found')
      )
    }

    const advance = await this.advance.getOne({
      userId: req.user!.id,
      courseId: course.id
    })

    if (advance) {
      throw new ConflictException()
    }

    const ticket = await (this.advance as { create(data: unknown): Promise<unknown> }).create({
      userId: req.user!.id,
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

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
  NotFoundException
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

  /**
   * Obtiene todas las secciones del advance con su progreso
   * Retorna EXACTAMENTE 15 unidades ordenadas (1-15)
   * Rellena con unidades vacías si faltan
   */
  private getAllSectionsWithProgress(advance: Record<string, unknown>): Array<{
    sectionIndex: number
    xp: number
    completed: boolean
    completedAt: string | null
    lastAccessed: boolean
    lastAccessedAt: string | null
  }> {
    const content = (advance.content as Record<string, unknown>) || {}
    const TOTAL_SECTIONS = 15
    
    // Encuentra la sección actual (marcada con "last": true) - máximo una
    let currentSectionIndex = -1
    for (const [key, value] of Object.entries(content)) {
      const val = value as Record<string, unknown> | undefined
      if (val?.last === true) {
        currentSectionIndex = parseInt(key, 10)
        break
      }
    }

    // Construye mapa de secciones (1-15)
    const unitsMap: Record<number, {
      sectionIndex: number
      xp: number
      completed: boolean
      completedAt: string | null
      lastAccessed: boolean
      lastAccessedAt: string | null
    }> = {}

    // Procesa secciones existentes
    for (let i = 1; i <= TOTAL_SECTIONS; i++) {
      const sectionData = (content[i.toString()] as Record<string, unknown>) || {}
      const isCurrentSection = i === currentSectionIndex
      const isCompleted = sectionData.completed === true
      const xpValue = typeof sectionData.general === 'number' ? sectionData.general : 0

      unitsMap[i] = {
        sectionIndex: i,
        xp: xpValue,
        completed: isCompleted,
        completedAt: isCompleted ? ((advance.updatedAt as string) || (advance.createdAt as string)) : null,
        lastAccessed: isCurrentSection,
        lastAccessedAt: isCurrentSection ? ((advance.updatedAt as string) || (advance.createdAt as string)) : null
      }
    }

    // Retorna array ordenado
    return Array.from({ length: TOTAL_SECTIONS }, (_, i) => unitsMap[i + 1])
  }

  @Bind
  async getAll(req: Request, res: Response): Promise<Response> {
    const query = req.query as Record<string, unknown>
    const user = req.user as Record<string, unknown> | undefined

    if (!user || typeof user.id !== 'number') {
      throw new BadRequestException('User not found')
    }

    const model = await this.models.getOne({
      name: query.model
    })

    if (model) {
      const courses = await this.courses.getAll(model.name as string, { id: user.id }) as unknown as Record<string, unknown>[]

      const isSubscribed = await this.packages.getOne({
        access: 'COURSES',
        isActive: true,
        userId: user.id,
        modelId: (model as unknown as Record<string, unknown>).id as number
      })

      const [course] = courses

      if ((isSubscribed as unknown as Record<string, unknown>)?.isActive && (course.advances as unknown[]).length === 0) {
        const content = await (this.advance as unknown as { create(data: unknown): Promise<unknown> }).create({
          content: {},
          courseId: (course.id as number),
          userId: (user.id as number)
        })

        ;(course.advances as unknown[]).push(content)
      }

      // TODO: Temporarily disabled payment check for development
      // Restore when payment system is ready
      // if (isSubscribed || query.demo === true) {
      
      // Obtén todas las secciones con progreso
      const units = (courses as Record<string, unknown>[])
        .flatMap((c: Record<string, unknown>) => 
          (c.advances as Record<string, unknown>[]).flatMap((adv: Record<string, unknown>) => 
            this.getAllSectionsWithProgress(adv)
          )
        )

      // Remove advances from courses (avoid redundancy)
      const cleanedCourses = (courses as Record<string, unknown>[]).map((course: Record<string, unknown>) => {
        const cleaned = { ...course }
        // Remove the advances array to avoid duplication
        delete cleaned.advances
        // Add totalSections metadata
        if (units.length > 0) {
          cleaned.totalSections = units.length
        }
        return cleaned
      })

      return res.json({
        message: 'Courses Obtained Successfully',
        response: {
          units,
          courses: cleanedCourses
        },
        statusCode: 200
      })
      // }

      // throw new PaymentException()
    }

    throw new NotFoundException()
  }

  @Bind
  async inscription(req: Request, res: Response): Promise<Response> {
    const { courseId } = req.body as { courseId: number }
    const user = req.user as Record<string, unknown> | undefined

    if (!user) {
      throw new BadRequestException('User not found')
    }

    const course = await this.courses.getOne({ id: courseId })

    this.logger.debug('course', course)

    if (!course) {
      throw new BadRequestException(
        res.__('errors.A course with the ID provided couldnt be found')
      )
    }

    const advance = await this.advance.getOne({
      userId: (user.id as number),
      courseId: course.id as number
    })

    if (advance) {
      throw new ConflictException()
    }

    const ticket = await (this.advance as unknown as { create(data: unknown): Promise<unknown> }).create({
      userId: (user.id as number),
      courseId: (course.id as number),
      content: {}
    })

    this.logger.debug('ticket', ticket)

    if (!ticket) {
      throw new ConflictException()
    }

    // Get all sections with progress
    const units = this.getAllSectionsWithProgress(ticket as Record<string, unknown>)

    return res.status(201).json({
      message: 'Inscription successfully created',
      response: {
        units,
        advanceId: (ticket as Record<string, unknown>).id
      },
      statusCode: 201
    })
  }
}

export { CoursesController }

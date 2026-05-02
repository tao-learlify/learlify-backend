import { AdvanceService } from './advance.service'
import { PlansService } from 'api/plans/plans.service'
import { PackagesService } from 'api/packages/packages.service'
import { NotFoundException, ForbiddenException } from 'exceptions'
import { Logger } from 'api/logger'
import { Bind } from 'decorators'
import feature from 'api/access/access.features'
import type { Request, Response } from 'express'

const TOTAL_UNITS = 15
const FREE_UNITS: number[] = [1]
const ALL_UNITS: number[] = Array.from({ length: TOTAL_UNITS }, (_, i) => i + 1)

export class AdvanceController {
  private defaultContent: Record<string, unknown>
  private advanceService: AdvanceService
  private plansService: PlansService
  private packagesService: PackagesService
  private logger: typeof Logger.Service

  constructor() {
    this.defaultContent = {}
    this.advanceService = new AdvanceService()
    this.plansService = new PlansService()
    this.packagesService = new PackagesService()
    this.logger = Logger.Service
  }

  @Bind
  async create(req: Request, res: Response): Promise<Response> {
    const user = req.user

    const data = req.body

    const advance = await this.advanceService.create({
      ...data,
      content: this.defaultContent,
      userId: user?.id as number
    })

    return res.json({
      message: 'Advance has been created',
      response: advance,
      statusCode: 200
    })
  }

  @Bind
  async getAll(req: Request, res: Response): Promise<Response> {
    const user = req.user

    const advance = await this.advanceService.getOne({
      courseId: req.query.courseId as unknown as number,
      userId: user?.id as number
    })

    const isSubscribed = await this.packagesService.getSubscriptions(
      {
        isActive: true,
        userId: user?.id as number
      },
      [feature.COURSES]
    )

    const unlockedUnits = isSubscribed ? ALL_UNITS : FREE_UNITS

    return res.status(200).json({
      message: 'Advance obtained succesfully',
      response: advance ? { ...advance, unlockedUnits } : { unlockedUnits },
      statusCode: 200
    })
  }

  @Bind
  async updateOne(req: Request, res: Response): Promise<Response> {
    const user = req.user

    const data = req.body

    const isSubscribed = await this.packagesService.getSubscriptions(
      {
        isActive: true,
        userId: user?.id as number
      },
      [feature.COURSES]
    )

    const unlockedUnits = isSubscribed ? ALL_UNITS : FREE_UNITS

    if (!unlockedUnits.includes(Number(data.unit))) {
      throw new ForbiddenException(res.__('errors.Unit Not Unlocked'))
    }

    const advance = await this.advanceService.getOne({
      userId: user?.id as number,
      courseId: data.courseId,
    })

    if (advance) {
      const { content } = advance

      if (data.completed) {
        Object.assign(content, {
          [data.unit]: {
            completed: content[data.unit] && (content[data.unit] as Record<string, unknown>).completed ? true : data.completed,
            general: data.last,
            last: true
          }
        })
      } else {
        Object.assign(content, {
          [data.unit]: {
            completed: content[data.unit] ? (content[data.unit] as Record<string, unknown>).completed : false,
            general: data.last,
            last: true
          }
        })
      }

      Object.keys(content).forEach(key => {
        if (key !== data.unit.toString()) {
          Object.assign(content, {
            [key]: {
              ...(content[key] as Record<string, unknown>),
              last: false
            }
          })
        }
      })

      const update = await this.advanceService.updateOne({
        id: advance.id,
        content
      })

      return res.json({
        response: update,
        statusCode: 201
      })
    }

    throw new NotFoundException(res.__('errors.Advance Not Found'))
  }
}

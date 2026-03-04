import { Bind } from 'decorators'
import { NotFoundException } from 'exceptions'

import { PackagesService } from 'api/packages/packages.service'
import { PlansService } from './plans.service'

import { Plan } from 'metadata/plans'
import { ModelsService } from 'api/models/models.service'
import { Models } from 'metadata/models'

import type { Request, Response } from 'express'
import type { OffersConfig } from './plans.types'

const pathPNG = 'https://dkmwdxc6g4lk7.cloudfront.net/assets/img'

export class PlansController {
  plansService: PlansService
  packagesService: PackagesService
  modelsService: ModelsService
  offers: OffersConfig

  constructor() {
    this.plansService = new PlansService()
    this.packagesService = new PackagesService()
    this.modelsService = new ModelsService()

    this.offers = {
      [Models.IELTS]: {
        byDefault: [Plan.GO, Plan.SILVER, Plan.PLATINUM],
        [Plan.GO]: [Plan.PLATINUM, Plan.SILVER, Plan.GOLD],
        [Plan.GOLD]: [Plan.PLATINUM, Plan.SILVER, Plan.BLUE],
        [Plan.PLATINUM]: [Plan.GREEN, Plan.BLUE, Plan.GOLD],
        [Plan.SILVER]: [Plan.PLATINUM, Plan.GOLD, Plan.BLUE]
      },
      [Models.APTIS]: {
        byDefault: [Plan.DIAMOND, Plan.GO, Plan.APTIS],
        [Plan.APTIS]: [Plan.GO, Plan.BLUE, Plan.GOLD],
        [Plan.GO]: [Plan.BLUE, Plan.GREEN, Plan.MASTER],
        [Plan.DIAMOND]: [Plan.BLUE, Plan.GREEN, Plan.MASTER]
      }
    }
  }

  @Bind
  async getAll(req: Request, res: Response) {
    const currency = req.currency ? req.currency : 'EUR'

    const data: Record<string, unknown> = {}

    const model = await this.modelsService.getOne({
      name: req.query.model
    })

    if (model) {
      if (req.query.pricing) {
        switch (model.name) {
          case Models.APTIS:
            data.plans = await this.plansService.getAll({
              names: [Plan.DIAMOND, Plan.GO, Plan.APTIS],
              modelId: model.id,
              currency
            })
            break

          case Models.IELTS:
            data.plans = await this.plansService.getAll({
              names: [Plan.PLATINUM, Plan.GO, Plan.SILVER],
              modelId: model.id,
              currency
            })
            break

          default:
            data.plans = []
        }

        return res.json({
          response: data.plans,
          statusCode: 200
        })
      }

      if (req.query.offers) {
        const packages = await this.packagesService.getAll({
          isActive: true,
          userId: req.user!.id,
          modelId: model.id
        })

        const defaults = this.offers[model.name as string].byDefault

        if (packages.length === 0) {
          const plans = await this.plansService.getAll({
            names: defaults,
            modelId: model.id,
            currency
          })

          return res.json({
            response: plans,
            statusCode: 200
          })
        }

        const names = (packages as unknown as Array<{ name?: string }>).map(plan => plan?.name)

        const filter = names.find(name => this.offers[model.name as string][name as string])

        const offers = await this.plansService.getAll({
          names: (filter || defaults) as string[],
          modelId: model.id,
          currency
        })

        return res.json({
          response: offers,
          statusCode: 200
        })
      }

      const plans = await this.plansService.getAll({
        modelId: model.id,
        available: true
      })

      const resource = (plans as unknown as Array<Record<string, unknown>>).map(plan => ({
        ...plan,
        currencyImage: pathPNG.concat('/', currency.toLowerCase(), '.png')
      }))

      return res.json({
        response: resource,
        statusCode: 200
      })
    }

    throw new NotFoundException('Model Not Found')
  }

  @Bind
  async updateOne(req: Request, res: Response) {
    const { planId, ...props } = req.body

    const plan = await this.plansService.getOne(null, planId)

    if (plan) {
      const updated = await this.plansService.updateOne({
        id: planId,
        ...props
      })

      return res.status(201).json({
        message: 'Plan udpated succesfully',
        response: updated,
        statusCode: 201
      })
    }

    throw new NotFoundException('Plan not found')
  }

  @Bind
  async findOne(req: Request, res: Response) {
    const id = req.params.id

    const plan = await this.plansService.getOne(null, parseInt(id))

    if (plan) {
      return res.status(200).json({
        message: 'Plan loaded succesfully',
        response: plan,
        statusCode: 200
      })
    }

    throw new NotFoundException('Plan Not Found')
  }

  @Bind
  async remove(req: Request, res: Response) {
    const id = req.params.id

    const plan = await this.plansService.getOne(null, parseInt(id))

    if (plan) {
      await this.plansService.remove(parseInt(id))

      return res.status(200).json({
        message: 'Plan has been deleted succesfully',
        response: {
          deleted: id
        },
        statusCode: 200
      })
    }

    throw new NotFoundException('Plan Not Found')
  }

  @Bind
  async create(req: Request, res: Response) {
    const plan = await this.plansService.create(req.body)

    return res.status(200).json({
      message: 'Plan created successfully',
      response: plan,
      statusCode: 200
    })
  }
}

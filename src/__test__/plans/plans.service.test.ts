jest.mock('decorators', () => ({
  Bind: (_t, _p, descriptor) => descriptor,
  Injectable: cls => cls,
  CronSchedule: cls => cls,
  Readonly: (_t, _p, descriptor) => descriptor,
  Router: () => cls => cls,
  Controller: cls => cls
}))

jest.mock('api/logger', () => ({
  Logger: {
    Service: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
  }
}))

jest.mock('exchange-rates-api', () => ({
  convert: jest.fn().mockResolvedValue('0')
}))

jest.mock('api/models/models.service', () => ({
  ModelsService: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('api/plans/plans.model', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}))

import Plan from 'api/plans/plans.model'
import { PlansService } from 'api/plans/plans.service'

const planModel = Plan as unknown as { query: jest.Mock }

function createNamedPlansBuilder(result = [{ id: 1, model: { name: 'IELTS' }, name: 'Silver' }]) {
  return {
    whereIn: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    withGraphFetched: jest.fn().mockResolvedValue(result)
  }
}

function createAllPlansBuilder(result = [{ id: 1 }]) {
  return {
    where: jest.fn().mockReturnThis(),
    withGraphJoined: jest.fn().mockResolvedValue(result)
  }
}

describe('PlansService', () => {
  let service: PlansService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new PlansService()
  })

  it('filters available plans by default when names are provided', async () => {
    const builder = createNamedPlansBuilder()
    planModel.query.mockReturnValue(builder)

    await service.getAll({
      modelId: 2,
      names: ['Silver']
    })

    expect(builder.whereIn).toHaveBeenCalledWith('name', ['Silver'])
    expect(builder.where).toHaveBeenCalledWith({
      available: true,
      modelId: 2
    })
    expect(builder.select).toHaveBeenCalledWith(service.clientAttributes)
    expect(builder.withGraphFetched).toHaveBeenCalledWith({
      access: true,
      model: true
    })
  })

  it('filters available plans by default when no names are provided', async () => {
    const builder = createAllPlansBuilder()
    planModel.query.mockReturnValue(builder)

    await service.getAll({
      modelId: 1
    })

    expect(builder.where).toHaveBeenCalledWith({
      available: true,
      modelId: 1
    })
    expect(builder.withGraphJoined).toHaveBeenCalledWith({
      access: true,
      model: true
    })
  })

  it('allows unavailable plans to be queried explicitly', async () => {
    const builder = createAllPlansBuilder()
    planModel.query.mockReturnValue(builder)

    await service.getAll({
      available: false,
      modelId: 1
    })

    expect(builder.where).toHaveBeenCalledWith({
      available: false,
      modelId: 1
    })
  })

  it('finds a plan by id without applying availability filters', async () => {
    const builder = {
      findById: jest.fn().mockResolvedValue({ id: 7 })
    }
    planModel.query.mockReturnValue(builder)

    const plan = await service.getOne(null, 7)

    expect(builder.findById).toHaveBeenCalledWith(7)
    expect(plan).toEqual({ id: 7 })
  })

  it('finds a plan by source without applying availability filters', async () => {
    const builder = {
      findOne: jest.fn().mockResolvedValue({ id: 8 })
    }
    const source = { id: 8 }
    planModel.query.mockReturnValue(builder)

    const plan = await service.getOne(source)

    expect(builder.findOne).toHaveBeenCalledWith(source)
    expect(plan).toEqual({ id: 8 })
  })
})

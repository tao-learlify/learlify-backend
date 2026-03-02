import { checkSchema, param } from 'express-validator'
import { ScheduleService } from './schedule.service'

class Schedule {
  constructor() {
    this.service = new ScheduleService()
  }

  get getAll() {
    return checkSchema({
      userId: {
        isNumeric: true,
        optional: true,
        toInt: true
      },
      langId: {
        isNumeric: true,
        optional: true,
        toInt: true
      }
    })
  }

  get remove() {
    return param('id')
      .isNumeric()
      .toInt()
  }
}

export const pipe = new Schedule()

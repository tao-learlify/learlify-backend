import { checkSchema, body } from 'express-validator'
import moment from 'moment'
export class GlobalPipe {
  static get identifierParameter() {
    return checkSchema({
      id: {
        in: 'params',
        toInt: true
      }
    })
  }

  static get pageQuery() {
    return checkSchema({
      page: {
        in: 'query',
        toInt: true
      }
    })
  }

  static get startDate() {
    return body('endDate').custom(value => moment(value).isValid())
  }

  static get endDate() {
    return body('endDate').custom(value => moment(value).isValid())
  }
}

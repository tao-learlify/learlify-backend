import config from '../../config'
import moment from 'moment-timezone'

export class ConfigService {
  constructor() {
    this.provider = config
    this.nameOptions = {
      options: {
        min: 1,
        max: 30
      }
    }
    this.passwordOptions = {
      options: {
        min: 8,
        max: 24
      }
    }
  }

  /**
   * @returns {Date}
   */
  getPackageExpirationDate() {
    return moment()
      .tz(this.provider.TZ)
      .add(1, 'month')
      .format('YYYY-MM-DD')
  }

  getLastLogin() {
    return moment()
      .tz(this.provider.TZ)
      .format('YYYY-MM-DD')
  }
}

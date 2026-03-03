import config from '../../config'
import moment from 'moment-timezone'
import type { ConfigurationProvider } from '@types'

export class ConfigService {
  provider: ConfigurationProvider
  nameOptions: { min: number; max: number }
  passwordOptions: { min: number; max: number }

  constructor() {
    this.provider = config as unknown as ConfigurationProvider
    this.nameOptions = { min: 1, max: 30 }
    this.passwordOptions = { min: 8, max: 24 }
  }

  getPackageExpirationDate(): string {
    return moment()
      .tz(this.provider.TZ)
      .add(1, 'month')
      .format('YYYY-MM-DD')
  }

  getLastLogin(): string {
    return moment()
      .tz(this.provider.TZ)
      .format('YYYY-MM-DD')
  }
}

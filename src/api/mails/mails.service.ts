import sgMail from '@sendgrid/mail'
import type { MailData } from '@sendgrid/helpers/classes/mail'
import type { Logger as WinstonLogger } from 'winston'

import { MODE } from 'common/process'
import { Logger } from 'api/logger'
import { ConfigService } from 'api/config/config.service'

export class MailService {
  private logger: WinstonLogger
    private configService: ConfigService


  constructor() {
    this.configService = new ConfigService()
    this.sendMail = this.sendMail.bind(this)
    this.logger = Logger.Service
  }

  async sendMail(msgOptions: MailData): Promise<void> {
    try {
      const apiKey = process.env.SENDGRID_API_KEY
      
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY environment variable is not set')
      }

      sgMail.setApiKey(apiKey)

      const defaults = {
        from: this.configService.provider.SENDGRID_APTIS_EMAIL,
        replyTo: this.configService.provider.SENDGRID_APTIS_ACADEMY
      }

      const to =
        process.env.NODE_ENV === MODE.development
          ? process.env.EMAIL_DEVELOPMENT || msgOptions.to
          : msgOptions.to

      const res = await sgMail.send(Object.assign(defaults, msgOptions, { to }) as MailData)

      this.logger.debug('sendMail Res', res)
    } catch (error) {
      this.logger.error('sendMail Error ', error)
    }
  }
}

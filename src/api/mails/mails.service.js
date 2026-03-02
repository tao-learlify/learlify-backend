import sgMail from '@sendgrid/mail'

import { ConfigService } from 'api/config/config.service'
import { Logger } from 'api/logger'
import { MODE } from 'common/process'

export class MailService {
  constructor() {
    this.configService = new ConfigService()
    this.sendMail = this.sendMail.bind(this)
    this.logger = Logger.Service
  }

  /**
   * @description Takes these arguments and returns a promise sending an email.
   * @param {{ to: string, from: string, subject: string, text: string, html: string}} msgOptions
   * @returns {Promise<void>}
   */
  async sendMail(msgOptions) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)

      const res = await sgMail.send({
        from: this.configService.provider.SENDGRID_APTIS_EMAIL,
        replyTo: this.configService.provider.SENDGRID_APTIS_ACADEMY,
        ...msgOptions,
        to:
          process.env.NODE_ENV === MODE.development
            ? process.env.EMAIL_DEVELOPMENT
            : msgOptions.to,
      })

      this.logger.debug('sendMail Res', res)
    } catch (error) {
      this.logger.error('sendMail Error ', error)
    }
  }
}

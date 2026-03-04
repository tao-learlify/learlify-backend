import { CronSchedule, Bind } from 'decorators'
import type { CronTrigger } from 'decorators'
import { Logger } from 'api/logger'
import { ConfigService } from 'api/config/config.service'
import { PackagesService } from 'api/packages/packages.service'
import { MailService } from 'api/mails/mails.service'
import { sendgridConfig } from 'api/mails'
import moment from 'moment-timezone'
import i18n from 'i18n'
import type {
  PackageTaskDTO,
  PackageNotifyFilterDTO,
  PackageExpireFilterDTO
} from 'api/packages/packages.types'

type ProviderTimezoneDTO = {
  TZ: string
  TIMEZONE_FORMAT: string
}

@CronSchedule
class PackagesTasks {
  private readonly logger: typeof Logger.Service
  private readonly mailService: MailService
  private readonly configService: ConfigService
  private readonly packagesService: PackagesService
  trigger!: CronTrigger

  constructor() {
    this.logger = Logger.Service
    this.mailService = new MailService()
    this.configService = new ConfigService()
    this.packagesService = new PackagesService()
  }

  @Bind
  async notify(): Promise<void> {
    this.trigger.schedule('0 */12 * * *', async (): Promise<void> => {
      const provider = this.configService.provider as unknown as ProviderTimezoneDTO

      try {
        const today = moment().tz(provider.TZ).format(provider.TIMEZONE_FORMAT)

        const expirationDate = moment()
          .tz(provider.TZ)
          .add(5, 'days')
          .format(provider.TIMEZONE_FORMAT)

        const packages = (await this.packagesService.getAll({
          date: {
            ranges: [today, expirationDate]
          }
        } as PackageNotifyFilterDTO)) as unknown as PackageTaskDTO[]

        for (const pack of packages) {
          await this.packagesService.updateOne({
            id: pack.id,
            isNotified: true
          })

          this.logger.debug('pack', pack)

          i18n.setLocale(pack.user.lang)

          await this.mailService.sendMail({
            to: pack.user.email,
            from: sendgridConfig.email,
            subject: i18n.__('mails.services.notifyExpiration.subject'),
            text: i18n.__('mails.services.notifyExpiration.text', {
              user: pack.user.firstName
            }),
            html: `
          <div>
            ${i18n.__('mails.services.notifyExpiration.html.notify')}
              <a href="${sendgridConfig.domain}">${
              sendgridConfig.domain
            }/account/pricing</a>
            ${i18n.__('mails.services.notifyExpiration.html.practice')}
          </div>
        `
          })

          this.logger.info('Mail and updated completed')
        }

        this.logger.info(
          'Users has been notified by the system, their packages will expired soon.'
        )
        this.logger.debug('Total packages notified affected: ', {
          total: packages.length
        })
      } catch (err: unknown) {
        const error = err as { name?: unknown; stack?: unknown }
        this.logger.error(error.name)
        this.logger.error(error.stack)
      }
    })
  }

  @Bind
  async expire(): Promise<void> {
    this.trigger.schedule('0 */12 * * *', async (): Promise<void> => {
      const provider = this.configService.provider as unknown as ProviderTimezoneDTO

      try {
        const packages = (await this.packagesService.getAll({
          date: {
            today: moment().tz(provider.TZ).format(provider.TIMEZONE_FORMAT)
          }
        } as PackageExpireFilterDTO)) as unknown as PackageTaskDTO[]

        this.logger.debug('Total packages expires:', { total: packages.length })

        for (const pack of packages) {
          this.logger.debug('pack', pack)

          i18n.setLocale(pack.user.lang)

          await this.packagesService.updateOne({
            id: pack.id,
            isActive: false
          })

          await this.mailService.sendMail({
            to: pack.user.email,
            from: sendgridConfig.email,
            subject: i18n.__('mails.services.packageExpiration.subject'),
            text: i18n.__('mails.services.packageExpiration.text', {
              user: pack.user.firstName
            }),
            html: `
            <div>
              <p>
                ${i18n.__('mails.services.packageExpiration.html.expiration', {
                  user: pack.user.firstName
                })}
                ${i18n.__('mails.services.packageExpiration.html.purchase')} 
                  <a href="${sendgridConfig.domain}">${
              sendgridConfig.domain
            }/account/pricing</a>
              </p>
              </strong>AptisGo</strong>
            </div>
          `
          })
        }
      } catch (err: unknown) {
        const error = err as { name?: unknown; stack?: unknown }
        this.logger.error(error.name)
        this.logger.error(error.stack)
      }
    })
  }
}

export default PackagesTasks

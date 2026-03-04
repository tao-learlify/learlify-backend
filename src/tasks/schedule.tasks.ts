import { OPEN_CLASS_ROOM, EXPIRE_CLASS_ROOM } from 'gateways/events'
import { Bind, CronSchedule } from 'decorators'
import type { CronTrigger } from 'decorators'
import { Logger } from 'api/logger'
import { MailService } from 'api/mails/mails.service'
import { ScheduleService } from 'api/schedule/schedule.service'
import { ScheduleController } from 'api/schedule/schedule.controller'
import { ConfigService } from 'api/config/config.service'
import { sendgridConfig } from 'api/mails'
import { Sockets } from '../index'
import moment from 'moment'
import type { ConfigurationProvider } from '@types'
import type {
  ScheduleTaskDTO,
  ScheduleNotifiedFilterDTO,
  ScheduleExpireClassRoomFilterDTO,
  ScheduleOpenClassRoomFilterDTO,
  ScheduleDeleteNotTakenFilterDTO,
  ScheduleDeleteByPayloadDTO
} from 'api/schedule/schedule.types'

type ErrorLike = {
  name?: unknown
  stack?: unknown
}

type ScheduleControllerWithProps = {
  props: {
    format: string
  }
}

type StreamGatewayLike = {
  stream: {
    to(room: string): {
      emit(event: string, payload: unknown): unknown
    }
  }
}

type ScheduleServiceLike = {
  getAll(options: Record<string, unknown>): Promise<unknown>
  updateOne(schedule: Record<string, unknown>): Promise<unknown>
  expireClassRoomAndUpdate(source: { id: number }): Promise<unknown>
  deleteBy(source: ScheduleDeleteByPayloadDTO): Promise<unknown>
}

type ScheduleServiceStatic = {
  scheduleTimezoneConversion(schedule: ScheduleTaskDTO, timezone: string): ScheduleTaskDTO
}

const scheduleServiceStatic = ScheduleService as unknown as ScheduleServiceStatic

@CronSchedule
class ScheduleTasks {
  private readonly logger: typeof Logger.Service
  private readonly mailService: MailService
  private readonly scheduleController: ScheduleControllerWithProps
  private readonly configService: ConfigService
  private readonly scheduleService: ScheduleServiceLike
  private readonly gateways: StreamGatewayLike
  private readonly props: { anticipationStartDate: number }
  trigger!: CronTrigger

  constructor() {
    this.logger = Logger.Service
    this.mailService = new MailService()
    this.scheduleController = new ScheduleController() as unknown as ScheduleControllerWithProps
    this.configService = new ConfigService()
    this.scheduleService = new ScheduleService() as unknown as ScheduleServiceLike
    this.gateways = Sockets as unknown as StreamGatewayLike
    this.props = {
      anticipationStartDate: 10
    }
  }

  get format(): string {
    return this.scheduleController.props.format
  }

  get config(): ConfigurationProvider {
    return this.configService.provider
  }

  @Bind
  async notified(): Promise<void> {
    this.trigger.schedule('*/5 * * * *', async (): Promise<void> => {
      try {
        this.logger.info('Notified has been executed')

        const date = {
          startDate: moment().utc().startOf('day').format(this.format),
          endDate: moment().utc().endOf('day').format(this.format)
        }

        this.logger.debug('date: notified', date)

        const schedules = (await this.scheduleService.getAll({
          date,
          taken: true,
          notified: false
        } as ScheduleNotifiedFilterDTO)) as ScheduleTaskDTO[]

        this.logger.debug('schedules', schedules)

        for (const schedule in schedules) {
          const current = scheduleServiceStatic.scheduleTimezoneConversion(
            schedules[schedule],
            this.config.TZ
          )

          this.logger.info('current', current)

          await this.mailService.sendMail({
            from: sendgridConfig.email,
            to: current.teacher.email,
            text: '¡Recordatorio para tu clase en AptisGo!',
            subject:
              'Estimado profesor, hemos enviado un recordatorio para su clase.',
            html: `
            <div>
              <p><strong>Hoy es el gran d&iacute;a! A las ${current.startDate} comenzar&aacute; tu clase en AptisGo.</strong></p> 
                <p>
                  Dentro de la aplicaci&oacute;n, 10 minutos antes de la hora de inicio ver&aacute;s una notificaci&oacute;n. En ella, pulsando el bot&oacute;n podr&aacute;s acceder al aula. 
                  <br />
                  Recomendamos acceder con antelaci&oacute;n para esperar al profesor y comprobar que todo funciona correctamente.
                </p>
              <p>
                Recomendamos que antes de la clase compruebes tener:
                <br />
                1. Un ordenador, con c&aacute;mara y micr&oacute;fono operativo. (Smartphone tambi&eacute;n compatible) 
                <br />
                2. Buena conexi&oacute;n de internet Wifi, o datos con buena se&ntilde;al. (En caso de ser posible, usar cable del router) 
                <br />
                3. Silencio y ambiente de concentraci&oacute;n para sacar el m&aacute;ximo provecho a tu videollamada. 
                <br />&iexcl;Esperamos que la disfrutes!
              </p>
            </div>
          `
          })

          await this.scheduleService.updateOne({
            id: current.id,
            notified: true
          })

          if (current.classes) {
            for (const meeting in current.classes.meetings) {
              const meetingIndex = current.classes.meetings[meeting]

              this.logger.info('meetingIteration', {
                schedule: schedules[schedule],
                meeting: meetingIndex
              })

              const timezone = scheduleServiceStatic.scheduleTimezoneConversion(
                schedules[schedule],
                meetingIndex.timezone
              )

              await this.mailService.sendMail({
                from: sendgridConfig.email,
                to: meetingIndex.user.email,
                text: '¡Recordatorio para tu clase en AptisGo!',
                subject:
                  'Estimado usuario, hemos enviado un recordatorio para su clase.',
                html: `
                  <div>
                    <p><strong>Hoy es el gran d&iacute;a! A las ${timezone.startDate} comenzar&aacute; tu clase en AptisGo.</strong></p> 
                      <p>
                        Dentro de la aplicaci&oacute;n, 10 minutos antes de la hora de inicio ver&aacute;s una notificaci&oacute;n. En ella, pulsando el bot&oacute;n podr&aacute;s acceder al aula. 
                      <br />
                      Recomendamos acceder con antelaci&oacute;n para esperar al profesor y comprobar que todo funciona correctamente.
                      </p>
                    <p>
                      Recomendamos que antes de la clase compruebes tener:
                    <br />
                      1. Un ordenador, con c&aacute;mara y micr&oacute;fono operativo. (Smartphone tambi&eacute;n compatible) 
                    <br />
                      2. Buena conexi&oacute;n de internet Wifi, o datos con buena se&ntilde;al. (En caso de ser posible, usar cable del router) 
                    <br />
                      3. Silencio y ambiente de concentraci&oacute;n para sacar el m&aacute;ximo provecho a tu videollamada. 
                    <br />&iexcl;Esperamos que la disfrutes!
                  </p>
                </div>
                `
              })
            }
          }

          this.logger.info(
            `Schedule ${schedules[schedule].id} has been notified.`
          )
        }
      } catch (err: unknown) {
        const error = err as ErrorLike
        this.logger.error(error.name)
        this.logger.error(error.stack)
      }
    })
  }

  @Bind
  async expireClassRoom(): Promise<void> {
    this.trigger.schedule('*/5 * * * *', async (): Promise<void> => {
      try {
        const date = moment().utc().format(this.format)

        const schedules = (await this.scheduleService.getAll({
          date: {
            expire: date
          },
          streaming: true
        } as ScheduleExpireClassRoomFilterDTO)) as ScheduleTaskDTO[]

        this.logger.info('expired classroom', schedules)

        schedules.forEach((schedule: ScheduleTaskDTO): void => {
          const room = (schedule.classes as { name: string }).name

          this.logger.info('Expire:', { room })

          if (room) {
            this.gateways.stream.to(room).emit(EXPIRE_CLASS_ROOM, {
              notification: true,
              room
            })
          }
        })

        const closeStreaming = schedules.map((schedule: ScheduleTaskDTO) =>
          this.scheduleService.expireClassRoomAndUpdate({
            id: schedule.id
          })
        )

        const total = await Promise.all(closeStreaming)

        this.logger.info('Total expiration', { schedule: total.length })
      } catch (err: unknown) {
        const error = err as ErrorLike
        this.logger.error(error.name)
        this.logger.error(error.stack)
      }
    })
  }

  @Bind
  async openClassRoom(): Promise<void> {
    this.trigger.schedule('*/5 * * * *', async (): Promise<void> => {
      try {
        const date = moment().utc().format(this.format)

        this.logger.info('date openClassRoom', { date })

        const data = (await this.scheduleService.getAll({
          date: {
            now: date,
            notExpired: true
          },
          notified: true,
          taken: true
        } as ScheduleOpenClassRoomFilterDTO)) as ScheduleTaskDTO[]

        const schedules = data.filter((schedule: ScheduleTaskDTO): boolean => {
          if (schedule.classes) {
            return schedule.classes.expired === false
          }
          return false
        })

        const availableStreamingCall = schedules.length > 0

        this.logger.info('schedules open', {
          active: schedules.length
        })

        if (availableStreamingCall) {
          schedules.forEach((schedule: ScheduleTaskDTO): void => {
            if (schedule.classes) {
              if (schedule.classes) {
                this.logger.info(`Tunnel ping to: ${schedule.classes.name}`)
              }

              schedule.classes.meetings.forEach(meet => {
                if (meet.user) {
                  this.logger.info(`Notification sended to ${meet.user.email}`)

                  this.gateways.stream.to(meet.user.email).emit(OPEN_CLASS_ROOM, {
                    notification: true,
                    schedules: schedules
                  })
                }
              })
            }
          })

          const openStreaming = schedules.map((schedule: ScheduleTaskDTO) =>
            this.scheduleService.updateOne({
              id: schedule.id,
              streaming: true
            })
          )

          const total = await Promise.all(openStreaming)

          this.logger.info('Total classes opened', {
            total
          })
        }
      } catch (err: unknown) {
        const error = err as ErrorLike
        this.logger.error(error.name)
        this.logger.error(error.stack)
      }
    })
  }

  @Bind
  async deleteSchedulesNotTakens(): Promise<void> {
    this.trigger.schedule('0 */24 * * *', async (): Promise<void> => {
      try {
        const now = moment().utc().format(this.format)

        const inactives = (await this.scheduleService.getAll({
          date: {
            expire: now
          },
          taken: false
        } as ScheduleDeleteNotTakenFilterDTO)) as ScheduleTaskDTO[]

        for (const inactive in inactives) {
          const current = inactives[inactive]

          await this.mailService.sendMail({
            from: sendgridConfig.email,
            to: current.teacher.email,
            text: 'Se ha eliminado un horario previo sin contratar',
            subject:
              'Estimado profesor, hemos eliminado un horario sin contrato',
            html: `
                <div>
                 <p>
                  Estimado ${current.teacher.firstName}, 
                  su horario que estaba disponible para ${current.startDate} - ${current.endDate}
                  ha sido cancelado y no contará para sus previos resultados.
                  El Equipo AptisGo.
                 </p>
                </div>
              `
          })
        }

        this.logger.debug('deleteScheduleTakensDate:', { now })

        const schedules = await this.scheduleService.deleteBy({
          taken: false,
          expire: now
        })

        this.logger.info(
          `${schedules as unknown as string} Schedules has been deleted from database.`
        )
      } catch (err: unknown) {
        const error = err as ErrorLike
        this.logger.error(error.name)
        this.logger.error(error.stack)
      }
    })
  }
}

export default ScheduleTasks

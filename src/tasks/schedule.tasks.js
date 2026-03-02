import { OPEN_CLASS_ROOM, EXPIRE_CLASS_ROOM } from 'gateways/events'
import { Bind, CronSchedule } from 'decorators'
import { Logger } from 'api/logger'
import { MailService } from 'api/mails/mails.service'
import { ScheduleService } from 'api/schedule/schedule.service'
import { ScheduleController } from 'api/schedule/schedule.controller'
import { ConfigService } from 'api/config/config.service'
import { sendgridConfig } from 'api/mails'
import { Sockets } from '../index'
import moment from 'moment'

@CronSchedule
class ScheduleTasks {
  constructor() {
    this.logger = Logger.Service
    this.mailService = new MailService()
    this.scheduleController = new ScheduleController()
    this.configService = new ConfigService()
    this.scheduleService = new ScheduleService()
    this.gateways = Sockets
    this.props = {
      anticipationStartDate: 10
    }
  }

  get format() {
    return this.scheduleController.props.format
  }

  get config() {
    return this.configService.provider
  }

  @Bind
  async notified() {
    this.trigger.schedule('*/5 * * * *', async () => {
      try {
        this.logger.info('Notified has been executed')

        const date = {
          startDate: moment().utc().startOf('day').format(this.format),
          endDate: moment().utc().endOf('day').format(this.format)
        }

        this.logger.debug('date: notified', date)

        /**
         * @description
         * This will give us all schedules from today.
         */
        const schedules = await this.scheduleService.getAll({
          date,
          taken: true,
          notified: false
        })

        this.logger.debug('schedules', schedules)

        /**
         * @description
         * This will sends a notification to the user that the class is able to start today.
         */
        for (const schedule in schedules) {
          const current = ScheduleService.scheduleTimezoneConversion(
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

          /**
           * @description
           * Patching schedule to notified that will not be recreated.
           */
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

              const timezone = ScheduleService.scheduleTimezoneConversion(
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

          /**
           * @description
           * Logging about the scheduled notified.
           */
          this.logger.info(
            `Schedule ${schedules[schedule].id} has been notified.`
          )
        }
      } catch (err) {
        this.logger.error(err.name)
        this.logger.error(err.stack)
      }
    })
  }

  @Bind
  async expireClassRoom() {
    this.trigger.schedule('*/5 * * * *', async () => {
        try {
          const date = moment().utc().format(this.format)

          const schedules = await this.scheduleService.getAll({
            date: {
              expire: date
            },
            streaming: true
          })

          this.logger.info('expired classroom', schedules)

          schedules.forEach(schedule => {
            const room = schedule.classes.name

            this.logger.info('Expire:', { room })

            if (room) {
              this.gateways.stream.to(room).emit(EXPIRE_CLASS_ROOM, {
                notification: true,
                room
              })
            }
          })

          /**
           * @description
           * This will close up all classroom availabls in that hour.
           */
          const closeStreaming = schedules.map(schedule =>
            this.scheduleService.expireClassRoomAndUpdate({
              id: schedule.id
            })
          )

          const total = await Promise.all(closeStreaming)

          this.logger.info('Total expiration', { schedule: total.length })
        } catch (err) {
          this.logger.error(err.name)
          this.logger.error(err.stack)
   
        }
    })
  }

  @Bind
  async openClassRoom() {
    this.trigger.schedule('*/5 * * * *', async () => {
      try {
        const date = moment().utc().format(this.format)

        this.logger.info('date openClassRoom', { date })

        const data = await this.scheduleService.getAll({
          date: {
            now: date,
            notExpired: true
          },
          notified: true,
          taken: true,
        })

        const schedules = data.filter(schedule => {
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
          schedules.forEach(schedule => {
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

          /**
           * @description
           * Getting all schedules, to update with parallelism.
           */
          const openStreaming = schedules.map(schedule =>
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
      } catch (err) {
        this.logger.error(err.name)
        this.logger.error(err.stack)
      }
    })
  }

  @Bind
  async deleteSchedulesNotTakens() {
    this.trigger.schedule('0 */24 * * *', async () => {
      try {
        const now = moment().utc().format(this.format)

        const inactives = await this.scheduleService.getAll({
          date: {
            expire: now
          },
          taken: false
        })

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
          `${schedules} Schedules has been deleted from database.`
        )
      } catch (err) {
        this.logger.error(err.name)
        this.logger.error(err.stack)
      }
    })
  }
}

export default ScheduleTasks

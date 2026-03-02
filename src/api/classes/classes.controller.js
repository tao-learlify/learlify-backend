import { ClassesService } from './classes.service'
import { ConfigService } from 'api/config/config.service'
import { ScheduleService } from 'api/schedule/schedule.service'
import { PackagesService } from 'api/packages/packages.service'
import { MailService } from 'api/mails/mails.service'
import {
  NotFoundException,
  PaymentException,
  ConflictException,
  ForbiddenException,
  TransactionError
} from 'exceptions'
import { v4 as uuidv4 } from 'uuid'
import { Bind } from 'decorators'
import { Roles } from 'metadata/roles'
import { Logger } from 'api/logger'
import moment from 'moment'
import { sendgridConfig } from 'api/mails'

class ClassesController {
  constructor() {
    this.props = {
      /**
       * @description
       * This value is a configurable value to extract history length.
       */
      maxHistoryLength: 5
    }
    this.classService = new ClassesService()
    this.scheduleService = new ScheduleService()
    this.packagesService = new PackagesService()
    this.configService = new ConfigService()
    this.mailsSerivce = new MailService()
    this.logger = Logger.Service
  }

  /**
   * @private
   * This will return the endpoint for history.
   */
  get _historyEndpoint() {
    return '/api/v1/classes/history'
  }

  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async create(req, res) {
    const { scheduleId, packageId } = req.body

    const indications = JSON.parse(req.body.indications)

    const pack = await this.packagesService.getOne({
      id: packageId
    })

    const classRoom = await this.classService.getOne({
      scheduleId
    })

    if (classRoom) {
      throw new ConflictException(res.__('errors.Room already exists'))
    }

    if (pack) {
      const doesntHavePackages = pack.classes === 0

      if (doesntHavePackages) {
        throw new PaymentException('Should adquire a new package')
      }

      const schedule = await this.scheduleService.getOne({
        id: scheduleId
      })

      if (schedule) {
        const classInstance = await this.classService.create({
          package: pack,
          schedule: schedule,
          user: req.user,
          name: uuidv4(),
          notified: false,
          timezone: req.timezone
        })

        this.logger.debug('classInstance', classInstance)

        if (classInstance.error) {
          throw new TransactionError(classInstance.error)
        }

        const timezone = {
          user: ScheduleService.scheduleTimezoneConversion(
            classInstance.schedule,
            req.timezone
          ),
          teacher: ScheduleService.scheduleTimezoneConversion(
            classInstance.schedule,
            this.configService.provider.TZ
          )
        }

        await this.mailsSerivce.sendMail({
          to: req.user.email,
          from: sendgridConfig.email,
          text: 'Confirmación de clase',
          subject: 'Hemos confirmado tu clase',
          html: `
            <div>
              <h2>&iexcl;Ya has confirmado tu clase en AptisGo!</h2>
              <p>
              <p><strong>El d&iacute;a ${moment(timezone.user.startDate).format(
                'YYYY-MM-DD'
              )} a las ${moment(timezone.user.startDate)
            .utc()
            .format('HH:mm A')} comenzar&aacute; tu clase con el profesor ${
            classInstance.schedule.teacher.firstName
          }.</strong></p>
                <p>Dentro de la aplicaci&oacute;n, 10 minutos antes de la hora de inicio ver&aacute;s una notificaci&oacute;n. En ella, pulsando el bot&oacute;n podr&aacute;s acceder al aula. <br />Recomendamos acceder con antelaci&oacute;n para esperar al profesor y comprobar que todo funciona correctamente.</p>
                <p>Recomendamos que antes de la clase compruebes tener:<br />
                  1. Un ordenador, con c&aacute;mara y micr&oacute;fono operativo. (Smartphone tambi&eacute;n compatible) <br />
                  2. Buena conexi&oacute;n de internet Wifi, o datos con buena se&ntilde;al. (En caso de ser posible, usar cable del router) <br />
                  3. Silencio y ambiente de concentraci&oacute;n para sacar el m&aacute;ximo provecho a tu videollamada. <br />&iexcl;Esperamos que la disfrutes!</p>
                <p>Tu exito, nuestro objetivo.</p>
              </p>
            </div>
          `
        })

        await this.mailsSerivce.sendMail({
          to: classInstance.schedule.teacher.email,
          from: sendgridConfig.email,
          subject: 'Clase confirmada',
          text: 'Clase confirmada',
          html: `
              <div>
                <h2>&iexcl;Your class at AptisGo - B1B2Top has been confirmed!</h2>
                <p><strong>Your class will begin the ${timezone.teacher.startDate}.</strong></p>
                <p><strong>Topic ${indications.level} </strong> ${indications.about}</p>
                <p>
                  You will receive a notification (blue) in the Dashboard of the platform. 
                  This notification will contain a button to access the call.
                  <br />
                  The class will automatically finish at the time set. 
                  <br />
                  In the case you have another class confirmed after this one, you will have 15 minutes break between them.
                  </p>
                  <p>
                    Remember to:
                    <br />
                    1. Check you are using a computer with a working camera and microphone.
                    <br />
                    2. Your internet connection is stable. (At least 4 MB download speed and 3 MB upload speed)
                    <br />
                    3. Check that you room is clean, silent, and with good lighting.
                  </p>
                <p>Thanks for being part of the team.</p>
                <p>AptisGo - B1B2Top</p>
              </div>
            `
        })

        await this.mailsSerivce.sendMail({
          to: this.configService.provider.SENDGRID_APTIS_ACADEMY,
          from: sendgridConfig.email,
          subject: 'Clase confirmada',
          text: 'Clase confirmada',
          html: `
              <div>
                <h2>&iexcl;Your class at AptisGo - B1B2Top has been confirmed!</h2>
                <p><strong>Your class will begin the ${timezone.teacher.startDate}.</strong></p>
                <p><strong>Topic ${indications.level} </strong> ${indications.about}</p>
                <p>
                  You will receive a notification (blue) in the Dashboard of the platform. 
                  This notification will contain a button to access the call.
                  <br />
                  The class will automatically finish at the time set. 
                  <br />
                  In the case you have another class confirmed after this one, you will have 15 minutes break between them.
                  </p>
                  <p>
                    Remember to:
                    <br />
                    1. Check you are using a computer with a working camera and microphone.
                    <br />
                    2. Your internet connection is stable. (At least 4 MB download speed and 3 MB upload speed)
                    <br />
                    3. Check that you room is clean, silent, and with good lighting.
                  </p>
                <p>Thanks for being part of the team.</p>
                <p>AptisGo - B1B2Top</p>
              </div>
            `
        })

        return res.status(200).json({
          message: 'Class created succesfully',
          response: classInstance,
          statusCode: 200
        })
      }
      throw new NotFoundException(res.__('errors.Schedule Not Found'))
    }

    throw new NotFoundException(res.__('errors.Package Not Found'))
  }

  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
    const user = req.user

    this.logger.debug('user', user)

    if (user.role.name === Roles.Teacher) {
      const classrooms = await this.classService.getAll({
        teacher: user.id,
        expired: false
      })

      this.logger.debug('classrooms', classrooms)

      return res.status(200).json({
        message: 'Classrooms fetched succesfully',
        response: classrooms,
        statusCode: 200
      })
    }

    /**
     * @description
     * If true, we should track all history.
     */
    const expired = req.originalUrl === this._historyEndpoint

    if (expired) {
      const { maxHistoryLength } = this.props

      const classrooms = await this.classService.getAll({
        user: user.id,
        expired: true,
        limit: maxHistoryLength
      })

      const classRoomTimezone = classrooms.map(classroom => {
        return {
          ...classroom,
          schedule: ScheduleService.scheduleTimezoneConversion(
            classroom.schedule,
            req.timezone
          )
        }
      })

      this.logger.debug('History:', classrooms)

      return res.status(200).json({
        message: 'Classrooms fetched succesfully',
        response: classRoomTimezone,
        statusCode: 200
      })
    }

    const classrooms = await this.classService.getAll({
      user: user.id,
      expired: false
    })

    const classRoomTimezone = classrooms.map(classroom => {
      return {
        ...classroom,
        schedule: ScheduleService.scheduleTimezoneConversion(
          classroom.schedule,
          req.timezone
        )
      }
    })

    this.logger.debug('Confirmed:', classrooms)

    return res.status(200).json({
      message: 'Classrooms fetched succesfully',
      response: classRoomTimezone,
      statusCode: 200
    })
  }

  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getOne(req, res) {
    const user = req.user

    const classRoom = await this.classService.getOne({
      name: req.query.name
    })

    if (classRoom) {
      if (req.query.info) {
        return res.json({
          response: classRoom.schedule.teacher,
          statusCode: 200
        })
      }

      const userInRoom = classRoom.meetings.find(
        meeting => meeting.user.email === user.email
      )

      const format = this.configService.provider.DATE_FORMAT

      /**
       * @description
       * If the class is between the actual date, classRoom can be service.
       * Just to make sure that we can't enter to the room.
       */
      const isAvailable = moment()
        .utc()
        .isBetween(
          moment(classRoom.schedule.anticipatedStartDate).format(format),
          moment(classRoom.schedule.endDate).format(format)
        )

      this.logger.info('isAvailable', { status: isAvailable })

      const teacherInRoom = classRoom.schedule.teacher.id === user.id

      if (isAvailable) {
        if (userInRoom || teacherInRoom) {
          return res.status(200).json({
            message: 'Classroom obtained succesfully',
            response: classRoom,
            statusCode: 200
          })
        }
      } else {
        throw new ForbiddenException(
          res.__('errors.The class-meeting is no longer available')
        )
      }

      throw new NotFoundException(res.__('errors.Classroom Not Found'))
    }

    throw new NotFoundException(res.__('errors.Classroom Not Found'))
  }
}

export { ClassesController }

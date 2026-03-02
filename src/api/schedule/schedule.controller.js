import { Bind } from 'decorators'
import { ConfigService } from 'api/config/config.service'
import { UsersService } from 'api/users/users.service'
import { MailService } from 'api/mails/mails.service'
import { ScheduleService } from './schedule.service'
import { NotFoundException, ForbiddenException } from 'exceptions'
import { Logger } from 'api/logger'
import moment from 'moment'

class ScheduleController {
  constructor() {
    this.configService = new ConfigService()
    this.mailService = new MailService()
    this.scheduleService = new ScheduleService()
    this.usersService = new UsersService()
    this.props = {
      daysOffset: 14,
      format: 'YYYY-MM-DD HH:mm:ss'
    }
    this.logger = Logger.Service
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async create(req, res) {
    const data = req.body

    const { format } = this.props

    const { provider } = this.configService

    /**
     * @description
     * Classes starts before startDate with.
     * AnticipatedStartDate.
     */
    const schedule = await this.scheduleService.create({
      ...data,
      anticipatedStartDate: moment(data.startDate)
        .subtract(10, 'minutes')
        .format(format)
    })

    await this.mailService.sendMail({
      from: provider.SENDGRID_APTIS_EMAIL,
      to: schedule.teacher.email,
      text: 'Te hemos asignado un horario disponible para AptisGo',
      subject: 'Te hemos asignado un horario disponible para AptisGo',
      html: `
          <div>
            Hola ${
              schedule.teacher.firstName
            }, aquí están los detalles de tu horario
            <ul>
              <li><b>Fecha de inicio</b>: ${moment(schedule.startDate).format(
                format
              )} </li>  
              <li><b>Fecha de culminación</b>: ${moment(schedule.enDate).format(
                format
              )} </li>
            </ul>
          </div>
        `
    })

    return res.status(201).json({
      message: 'Schedule has been created succesfully',
      response: schedule,
      statusCode: 201
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
    this.logger.debug('Timezone', { timezone: req.timezone })

    const { userId, langId } = req.query

    const { daysOffset, format } = this.props

    if (userId || langId) {
      const schedules = await this.scheduleService.getAll({
        date: {
          startDate: moment().subtract(daysOffset, 'days').format(format),
          endDate: moment().add(daysOffset, 'days').format(format)
        },
        userId,
        langId
      })

      this.logger.debug('Schedule', {
        total: schedules.length
      })

      return res.status(200).json({
        message: 'Schedule obtained successfully',
        response: schedules.map(schedule =>
          ScheduleService.scheduleTimezoneConversion(schedule, req.timezone)
        ),
        statusCode: 200
      })
    }

    const schedules = await this.scheduleService.getAll({
      date: {
        startDate: moment().subtract(daysOffset, 'days').format(format),
        endDate: moment().add(daysOffset, 'days').format(format)
      }
    })

    this.logger.debug('Schedule', {
      total: schedules.length
    })

    return res.status(200).json({
      message: 'Schedule obtained successfully',
      response: schedules.map(schedule =>
        ScheduleService.scheduleTimezoneConversion(schedule, req.timezone)
      ),
      statusCode: 200
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async remove(req, res) {
    const id = req.params.id

    const schedule = await this.scheduleService.getOne({
      id
    })

    if (schedule.classes) {
      throw new ForbiddenException()
    }

    if (schedule) {
      await this.scheduleService.remove(id)

      return res.status(200).json({
        message: 'Schedule has been deleted succesfully',
        response: {
          deleted: id
        },
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.Schedule Not Found'))
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  async update(req, res) {
    const data = req.body

    const schedule = await this.scheduleService.getOne({
      id: data.id
    })

    if (schedule) {
      const update = await this.scheduleService.updateOne(data)

      return res.status(201).json({
        message: 'Update successfully',
        response: update,
        statusCode: 201
      })
    }

    throw new NotFoundException(res.__('errors.Schedule Not Found'))
  }

  /**
   *
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async earlyStream(req, res) {
    const user = req.user.id

    const stream = await this.scheduleService.getStream(user)

    this.logger.info('stream', {
      stream: stream ? 'User has active meeting' : 'Inactive Meetings'
    })

    const lastStreamActive = stream.find(({ classes }) => {
      const [current] = classes

      const schedule = current.schedule

      if (schedule) {
        return (
          moment()
            .utc()
            .isBetween(schedule.anticipatedStartDate, schedule.endDate) ||
          moment().utc().isBetween(schedule.startDate, schedule.endDate)
        )
      }
      return
    })

    this.logger.info('lastStream', lastStreamActive)

    if (lastStreamActive) {
      const schedule = await this.scheduleService.getOne({
        id: lastStreamActive.classes[0].schedule.id
      })

      return res.status(200).json({
        response: schedule,
        statusCode: 200
      })
    }

    return res.status(200).json({
      response: null,
      statusCode: 200
    })
  }
}

export { ScheduleController }

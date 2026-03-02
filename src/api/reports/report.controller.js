import { MailService } from 'api/mails/mails.service'
import { ConfigService } from 'api/config/config.service'
import { UsersService } from 'api/users/users.service'
import { Bind } from 'decorators'

class ReportController {
  constructor () {
    this.configService = new ConfigService()
    this.mailService = new MailService()
    this.usersService = new UsersService()
  }

  /**
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  @Bind
  async create (req, res) {
    const { context, device, from, message } = req.body

    const { provider } = this.configService

    await this.mailService.sendMail({
      from: provider.SENDGRID_APTIS_EMAIL,
      to: from,
      subject: context,
      message: 'Has recibido un report en AptisGo',
      text: context,
      html: `
        <div>
          <p>
            <span style="font-weight: bold; color: #323065">
              ${message}
            </span>
            <div style="font-size: 13px; color: #716b65">
              ${device}
            </div>
          </p>
        </div>
      `   
    })

    return res.status(200).json({
      message: 'Report has been sended',
      statusCode: 200
    })
  }

  /**
   * 
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  @Bind
  async quality (req, res) {
    const user = req.user

    const { video, assist } = req.body

    const { provider } = this.configService

    const teacher = this.usersService.getOne({
      id: req.query.teacher
    })

    await this.mailService.sendMail({
      from: provider.SENDGRID_APTIS_EMAIL,
      to: provider.SENDGRID_APTIS_ACADEMY,
      text: `El estudiante ${user.firstName} ${user.lastName} Ha calificado una vídeo llamada`,
      subject: `El estudiante ${user.firstName} Ha calificado una vídeo llamada`,
      html: `
        <div>
          La llamada se ha calificado con una puntuación de <strong>${video}</strong> puntos. <br>
          El estudiante ha calificado al profesor con una puntuación de <strong>${assist}</strong> puntos.
        </div>
      `
    })

    if (teacher?.email) {
      await this.mailService.sendMail({
        from: provider.SENDGRID_APTIS_EMAIL,
        to: teacher.email,
        text: `${user.firstName} ${user.lastName} Ha calificado una vídeo llamada`,
        subject: `El estudiante ${user.firstName} Ha calificado una vídeo llamada`,
        html: `
          <div>
            La llamada se ha calificado con una puntuación de ${video} puntos,
            El estudiante ha calificado al profesor con una puntuación de ${assist}
          </div>
        `
      })
    }

    return res.status(201).json({
      message: 'Quality report has been sended',
      statusCode: 201
    })
  }
}

export { ReportController }
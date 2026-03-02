import { AdminService } from './admin.service'
import { ConfigService } from 'api/config/config.service'
import { MailService } from 'api/mails/mails.service'
import { AuthenticationService } from 'api/authentication/authentication.service'
import { RolesService } from 'api/roles/roles.services'
import { UsersService } from 'api/users/users.service'
import { NotFoundException, ConflictException } from 'exceptions'
import { PackagesService } from 'api/packages/packages.service'
import { Logger } from 'api/logger'
import { Bind } from 'decorators'

class AdminController {
  constructor() {
    this.adminService = new AdminService()

    this.authService = new AuthenticationService()

    this.configService = new ConfigService()

    this.mailService = new MailService()

    this.rolesService = new RolesService()

    this.usersService = new UsersService()

    this.packagesService = new PackagesService()

    this.logger = Logger.Service
  }
  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async createUser(req, res) {
    const data = req.body

    const role = await this.rolesService.findOne({ name: data.role })

    const user = await this.usersService.getOne({ email: data.email })

    if (user) {
      throw new ConflictException(res.__('errors.User already exists'))
    }

    if (role) {
      const password = await this.authService.generateRandomPassword({
        useHash: true
      })

      const user = await this.adminService.createUser({
        email: data.email,
        firstName: data.firstName,
        isVerified: true,
        lastName: data.lastName,
        password: password.hash,
        roleId: role.id
      })

      this.logger.debug('user', user)

      await this.mailService.sendMail({
        to: user.email,
        from: this.configService.provider.SENDGRID_APTIS_EMAIL,
        subject: res.__('mails.services.createUser.subject'),
        text: res.__('mails.services.createUser.text', {
          user: user.firstName
        }),
        html: `
        <div>
          ${res.__('mails.services.createUser.html.assign')}
          <p style="color: red">
            ${res.__('mails.services.createUser.html.password')}
            <strong>
              ${password.value}
            </strong>
          </p>
        </div>
      `
      })

      delete user.password

      return res.status(201).json({
        message: 'User has been created',
        response: user,
        statusCode: 201
      })
    }

    throw new NotFoundException(res.__('errors.Role Not Found'))
  }

  /**
   *
   * @param {Express.Request} req
   * @param {Express.Response} res
   */
  @Bind
  async viewUserInfo(req, res) {
    /**
     * @param {string}
     */
    const email = req.query.email

    const user = await this.usersService.getOne({
      email
    })

    delete user.stripeCustomerId
    delete user.role

    if (user) {
      const count = await this.packagesService.getWritingsAndSpeakings({
        userId: user.id
      })

      const membership = await this.packagesService.getAll({
        isActive: true
      })

      return res.json({
        response: {
          ...user,
          ...count,
          membership: membership.length > 0
        },
        statusCode: 200
      })
    }

    throw new NotFoundException('User Not Found')
  }
}

export { AdminController }

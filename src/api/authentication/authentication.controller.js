import { AuthenticationService } from './authentication.service'
import { UsersService } from 'api/users/users.service'
import { RolesService } from 'api/roles/roles.services'
import { MailService } from 'api/mails/mails.service'
import { Roles } from 'metadata/roles'
import { ConfigService } from 'api/config/config.service'
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException
} from 'exceptions'
import { sendgridConfig } from 'api/mails'
import { Logger } from 'api/logger'
import { Bind } from 'decorators'
import moment from 'moment'

export class AuthenticationController {
  constructor() {
    this.logger = Logger.Service
    this.authService = new AuthenticationService()
    this.configService = new ConfigService()
    this.userService = new UsersService()
    this.rolesService = new RolesService()
    this.mailService = new MailService()
  }

  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async signUp(req, res) {
    const sign = req.body

    const isAvailable = await this.userService.getOne({
      email: sign.email
    })

    if (isAvailable) {
      this.logger.debug('User already exists')
      throw new ConflictException(res.__('errors.User already exists'))
    }

    const role = await this.rolesService.findOne({ name: Roles.User })

    const user = await this.userService.create({
      email: sign.email,
      firstName: sign.firstName,
      isVerified: false,
      lang: req.locale,
      lastName: sign.lastName,
      password: await this.authService.hash(sign.password),
      roleId: role.id,
      lastLogin: moment().format('YYYY-MM-DD')
    })

    const data = await this.userService.getOne({
      id: user.id
    })

    const confirmationCode = this.authService.encrypt(
      { email: data.email },
      {
        encryptOptions: {
          expiresIn: '1d'
        }
      }
    )

    await this.mailService.sendMail({
      from: this.configService.provider.SENDGRID_APTIS_EMAIL,
      to: user.email,
      subject: res.__('mails.services.signUp.subject'),
      text: res.__('mails.services.signUp.text'),
      html: `
        <div>
          <p>${res.__('mails.services.signUp.html.verification')}</p>
          <a href="${
            sendgridConfig.domain
          }/account/verification?code=${confirmationCode}">
            ${res.__('mails.services.signUp.html.verificate')}
          </a>
        </div>
        <div>
          ${res.__('mails.services.signUp.html.thanks')}
          ${res.__('mails.services.signUp.html.practice')}
          ${res.__('mails.services.signUp.html.team')}
            <a href="${sendgridConfig.domain}">
              ${res.__('mails.services.signUp.html.team')} ${
        sendgridConfig.domain
      }</a>
          </div>
    `
    })

    return res.status(201).json({
      message: 'Register completed',
      response: {
        token: this.authService.encrypt({ ...data }, { clientConfig: true })
      },
      statusCode: 201
    })
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async signIn(req, res) {
    const sign = req.body

    const user = await this.userService.getOne({
      allowPrivateData: true,
      email: sign.email
    })

    if (user) {
      const authenticate = await this.authService.compareHash(
        sign.password,
        user.password
      )

      if (authenticate) {
        await this.userService.updateOne({
          id: user.id,
          lang: req.locale,
          lastLogin: moment().format('YYYY-MM-DD')
        })

        const token = this.authService.encrypt(
          { ...user, role: user.role, model: user.model },
          { clientConfig: true }
        )

        return res.status(200).json({
          message: 'Login Succesfully',
          response: {
            token
          },
          statusCode: 200
        })
      }
    }

    throw new BadRequestException(res.__('errors.Invalid password or username'))
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async googleLogin(req, res) {
    const sign = req.body

    const isGoogleUser = await this.userService.getOne({
      email: sign.email,
      googleId: sign.googleId
    })

    if (isGoogleUser) {
      await this.userService.updateOne({
        id: isGoogleUser.id,
        lastLogin: moment().format('YYYY-MM-DD')
      })

      const token = await this.authService.encrypt(
        {
          ...isGoogleUser,
          role: isGoogleUser.role
        },
        { clientConfig: true }
      )

      return res.status(200).json({
        message: 'Login succesfully',
        response: {
          token
        },
        statusCode: 200
      })
    }

    const user = await this.userService.getOne({
      email: sign.email
    })

    if (user) {
      const update = await this.userService.updateOne({
        id: user.id,
        googleId: sign.googleId,
        isVerified: true,
        lastLogin: moment().format('YYYY-MM-DD')
      })

      this.logger.info('googleId update', update)

      const token = this.authService.encrypt(
        {
          ...update,
          role: update.role
        },
        { clientConfig: true }
      )

      return res.status(200).json({
        message: 'Login succesfully',
        response: {
          token
        },
        statusCode: 200
      })
    }

    /**
     * Generates a random password.
     * Because user is not authenticated.
     */
    const password = await this.authService.generateRandomPassword({
      useHash: true
    })

    /**
     * Getting role.
     */
    const role = await this.rolesService.findOne({ name: Roles.User })

    const create = await this.userService.create({
      email: sign.email,
      firstName: sign.givenName,
      lastName: sign.familyName || 'AptisGo',
      googleId: sign.googleId,
      imageUrl: sign.imageUrl,
      isVerified: true,
      lang: req.locale,
      password: password.hash,
      roleId: role.id,
      lastLogin: moment().format('YYYY-MM-DD')
    })

    await this.mailService.sendMail({
      to: create.email,
      from: this.configService.provider.SENDGRID_APTIS_EMAIL,
      subject: res.__('mails.services.googleSignUp.subject'),
      text: res.__('mails.services.googleSignUp.text', {
        user: create.firstName,
        locale: req.locale
      }),
      html: `
        <div>
          <p style="font-size: 13px">${res.__(
            'mails.services.googleSignUp.html.password'
          )}: <strong style="color: red; font-size: 16px;"> ${
        password.value
      }</strong></p>
      
        </div>
      `
    })

    const token = this.authService.encrypt(
      { ...create, role: create.role },
      { clientConfig: true }
    )

    return res.status(201).json({
      message: 'Sign Up Succesfully',
      response: {
        token
      },
      statusCode: 201
    })
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async facebookLogin(req, res) {
    const body = req.body

    const facebookUser = await this.userService.getOne({
      email: body.email,
      facebookId: body.facebookId
    })

    if (facebookUser) {
      await this.userService.updateOne({
        id: facebookUser.id,
        lastLogin: moment().format('YYYY-MM-DD')
      })

      const token = await this.authService.encrypt(
        {
          ...facebookUser,
          role: facebookUser.role
        },
        { clientConfig: true }
      )

      return res.status(200).json({
        message: 'Login succesfully',
        response: {
          token
        },
        statusCode: 200
      })
    }

    const user = await this.userService.getOne({
      email: body.email
    })

    if (user) {
      const updatedUser = await this.userService.updateOne({
        id: user.id,
        facebookId: body.facebookId,
        isVerified: true,
        lastLogin: moment().format('YYYY-MM-DD')
      })

      this.logger.info('facebookId update', updatedUser)

      const token = this.authService.encrypt(
        {
          ...updatedUser,
          role: updatedUser.role
        },
        { clientConfig: true }
      )

      return res.status(200).json({
        message: 'Login succesfully',
        response: {
          token
        },
        statusCode: 200
      })
    }

    /**
     * Generates a random password.
     * Because user is not authenticated.
     */
    const password = await this.authService.generateRandomPassword({
      useHash: true
    })

    /**
     * Getting role.
     */
    const role = await this.rolesService.findOne({ name: Roles.User })

    const createdUser = await this.userService.create({
      email: body.email,
      firstName: body.givenName,
      lastName: body.familyName || 'AptisGo',
      facebookId: body.facebookId,
      imageUrl: body.imageUrl,
      isVerified: true,
      lang: req.locale,
      password: password.hash,
      roleId: role.id,
      lastLogin: moment().format('YYYY-MM-DD')
    })

    await this.mailService.sendMail({
      to: createdUser.email,
      from: this.configService.provider.SENDGRID_APTIS_EMAIL,
      subject: res.__('mails.services.googleSignUp.subject'),
      text: res.__('mails.services.googleSignUp.text', {
        user: createdUser.firstName,
        locale: req.locale
      }),
      html: `
        <div>
          <p style="font-size: 13px">${res.__(
            'mails.services.googleSignUp.html.password'
          )}: <strong style="color: red; font-size: 16px;"> ${
        password.value
      }</strong></p>
      
        </div>
      `
    })

    const token = this.authService.encrypt(
      { ...createdUser, role: createdUser.role },
      { clientConfig: true }
    )

    return res.status(201).json({
      message: 'Sign Up Succesfully',
      response: {
        token
      },
      statusCode: 201
    })
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async verification(req, res) {
    const code = req.query.code

    /**
     * The token is being destructured for two reasons.
     * Once the account is created is being sended with email and id of the user.
     */
    const { email, error } = this.authService.decrypt(code)

    this.logger.info('decode', {
      email,
      error
    })

    if (error) {
      throw new BadRequestException(
        res.__('errors.Invalid Token Assignament or expired')
      )
    }

    const user = await this.userService.getOne({
      email: email
    })

    if (user) {
      await this.userService.updateOne({
        id: user.id,
        isVerified: true
      })

      return res.status(201).json({
        message: 'Account has been verified',
        response: {
          token: this.authService.encrypt(
            { ...user, isVerified: true },
            { clientConfig: true }
          )
        },
        statusCode: 201
      })
    }

    throw new NotFoundException(res.__('errors.The account cannot be verified'))
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async forgot(req, res) {
    const email = req.query.email

    /**
     * Checking if the user exist.
     */
    const available = await this.userService.getOne({
      email
    })

    if (available) {
      const user = await this.userService.getOne({
        email
      })

      /**
       * @description
       * This token will be sended to the mail.
       * Will last 24 hours.
       */
      const token = this.authService.encrypt(
        { email: user.email, id: user.id },
        {
          encryptOptions: {
            expiresIn: '1d'
          }
        }
      )

      await this.mailService.sendMail({
        from: this.configService.provider.SENDGRID_APTIS_EMAIL,
        to: user.email,
        subject: res.__('mails.services.resetPassword.subject', {
          user: user.firstName
        }),
        text: res.__('mails.services.resetPassword.text', {
          user: user.firstName
        }),
        html: `
        <div>
          <p>${res.__('mails.services.resetPassword.html.greet', {
            user: user.firstName
          })}</p>
          <p>
            ${res.__('mails.services.resetPassword.html.practice')}
            <strong>${res.__('mails.services.resetPassword.html.team')}</strong>
          </p>
          <a href="${sendgridConfig.domain}/accounts/reset?code=${token}">
            Restaura tu cuenta haciendo click aquí
          </a>
          <br>
          <strong>El enlance está habilitado hasta por 24 horas</strong>
        </div>
        `
      })

      return res.status(200).json({
        response: {
          details: {
            to: email,
            date: this.configService.getLastLogin()
          },
          sended: true
        },
        statusCode: 200
      })
    }

    this.logger.warn('Invalid email or user')

    return res.status(404).json({
      message: 'Not Found',
      statusCode: 404
    })
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async refreshToken(req, res) {
    const { id, error } = this.authService.decrypt(req.body.token)

    /**
     * If token throws an error, forbidden exception should be dispatch.
     */
    if (error) {
      this.logger.error('Error: Token is not valid.')

      throw new ForbiddenException()
    }

    const user = await this.userService.getOne({ id })

    if (user) {
      return res.status(200).json({
        message: 'Token refresh succesfully',
        response: {
          token: this.authService.encrypt({ ...user }, { clientConfig: true })
        },
        statusCode: 200
      })
    }

    throw new NotFoundException(res.__('errors.User Not Found'))
  }

  @Bind
  async resetPassword(req, res) {
    const { code, password } = req.body

    const decrypt = await this.authService.decrypt(code)

    if (decrypt.error) {
      throw new BadRequestException(
        res.__('errors.Invalid Token Assignament or expired')
      )
    }

    const user = await this.userService.getOne({
      id: decrypt.id
    })

    if (user) {
      const update = await this.userService.updateOne({
        id: user.id,
        password: await this.authService.hash(password)
      })

      return res.status(201).json({
        message: 'Reset password succesfully',
        response: {
          token: this.authService.encrypt({ ...update }, { clientConfig: true })
        },
        statusCode: 201
      })
    }
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async demoUser(req, res) {
    const user = await this.userService.getOne({
      allowPrivateData: true,
      email: 'aptisgo@noreply'
    })

    await this.userService.updateOne({
      id: user.id,
      lang: req.locale,
      lastLogin: moment().format('YYYY-MM-DD')
    })

    const token = this.authService.encrypt(
      { ...user, role: user.role },
      { clientConfig: true }
    )

    return res.status(200).json({
      message: 'Login Succesfully',
      response: {
        token
      },
      statusCode: 200
    })
  }
}

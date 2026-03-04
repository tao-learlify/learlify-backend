import type { Request, Response } from 'express'
import { AuthenticationService } from './authentication.service'
import { UsersService } from 'api/users/users.service'
import { RolesService } from 'api/roles/roles.services'
import { MailService } from 'api/mails/mails.service'
import { addToBlocklist } from 'api/jwt/jwt.blocklist'
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
import type {
  SignUpBody,
  SignInBody,
  GoogleLoginBody,
  FacebookLoginBody,
  RefreshTokenBody,
  ResetPasswordBody
} from './authentication.types'

export class AuthenticationController {
  private logger = Logger.Service
  private authService: AuthenticationService
  private configService: ConfigService
  private userService: UsersService
  private rolesService: RolesService

  private mailService: MailService

  constructor() {
    this.authService = new AuthenticationService()
    this.configService = new ConfigService()
    this.userService = new UsersService()
    this.rolesService = new RolesService()
    this.mailService = new MailService()
  }

  @Bind
  async signUp(req: Request, res: Response): Promise<Response> {
    const sign = req.body as SignUpBody

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
      { email: data!.email },

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

  @Bind
  async signIn(req: Request, res: Response): Promise<Response> {
    const sign = req.body as SignInBody

    const user = await this.userService.getOne({
      allowPrivateData: true,
      email: sign.email
    })

    if (user) {
      const authenticate = await this.authService.compareHash(
        sign.password,
        user.password!
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

  @Bind
  async googleLogin(req: Request, res: Response): Promise<Response> {
    const sign = req.body as GoogleLoginBody

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

    const password = await this.authService.generateRandomPassword({
      useHash: true
    })

    const role = await this.rolesService.findOne({ name: Roles.User })

    const create = await this.userService.create({
      email: sign.email,
      firstName: sign.givenName,
      lastName: sign.familyName || 'AptisGo',
      googleId: sign.googleId,
      imageUrl: sign.imageUrl,
      isVerified: true,
      lang: req.locale,
      password: password.hash ?? undefined,
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

  @Bind
  async facebookLogin(req: Request, res: Response): Promise<Response> {
    const body = req.body as FacebookLoginBody

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

    const password = await this.authService.generateRandomPassword({
      useHash: true
    })

    const role = await this.rolesService.findOne({ name: Roles.User })

    const createdUser = await this.userService.create({
      email: body.email,
      firstName: body.givenName,
      lastName: body.familyName || 'AptisGo',
      facebookId: body.facebookId,
      imageUrl: body.imageUrl,
      isVerified: true,
      lang: req.locale,
      password: password.hash ?? undefined,
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

  @Bind
  async verification(req: Request, res: Response): Promise<Response> {
    const code = req.query.code as string

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

  @Bind
  async forgot(req: Request, res: Response): Promise<Response> {
    const email = req.query.email as string

    const available = await this.userService.getOne({
      email
    })

    if (available) {
      const user = (await this.userService.getOne({
        email
      }))!

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

  @Bind
  async refreshToken(req: Request, res: Response): Promise<Response> {
    const { token: rawToken } = req.body as RefreshTokenBody
    const { id, error } = this.authService.decrypt(rawToken)

    if (error) {
      this.logger.error('Error: Token is not valid.')

      throw new ForbiddenException('')
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
  async resetPassword(req: Request, res: Response): Promise<Response> {
    const { code, password } = req.body as ResetPasswordBody

    const decrypt = this.authService.decrypt(code)

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

    throw new NotFoundException(res.__('errors.User Not Found'))
  }

  @Bind
  async demoUser(req: Request, res: Response): Promise<Response> {
    const user = (await this.userService.getOne({
      allowPrivateData: true,
      email: 'aptisgo@noreply'
    }))!

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

  @Bind
  async logout(req: Request, res: Response): Promise<Response> {
    const authHeader = req.headers['authorization'] ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (token) {
      await addToBlocklist(token)
    }

    return res.status(200).json({
      message: 'Logged out successfully',
      statusCode: 200
    })
  }
}

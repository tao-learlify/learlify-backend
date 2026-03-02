import { ConfigService } from 'api/config/config.service'
import { CategoriesService } from 'api/categories/categories.service'
import { StripeService } from 'api/stripe/stripe.service'
import { PackagesService } from './packages.service'
import { PlansService } from 'api/plans/plans.service'
import { MailService } from 'api/mails/mails.service'
import { UsersService } from 'api/users/users.service'
import { ProgressService } from 'api/progress/progress.service'
import {
  NotFoundException,
  PaymentException,
  TransactionError
} from 'exceptions'
import { Logger } from 'api/logger'
import { sendgridConfig } from 'api/mails'
import { Bind } from 'decorators'

class PackagesController {
  constructor() {
    this.logger = Logger.Service
    this.categoriesService = new CategoriesService()
    this.packagesService = new PackagesService()
    this.configService = new ConfigService()
    this.plansService = new PlansService()
    this.mailService = new MailService()
    this.usersService = new UsersService()
    this.progressService = new ProgressService()
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async assign(req, res) {
    const { userId, planId } = req.query

    const user = await this.usersService.getOne({ id: userId })

    if (user) {
      const plan = await this.plansService.getOne({ id: planId })

      if (plan) {
        const expirationDate = this.configService.getPackageExpirationDate()

        const pack = await this.packagesService.create({
          isActive: true,
          writings: plan.writing,
          speakings: plan.speaking,
          classes: plan.classes,
          planId,
          userId,
          expirationDate
        })

        if (pack) {
          await this.mailService.sendMail({
            to: user.email,
            from: this.configService.provider.SENDGRID_APTIS_EMAIL,
            subject: res.__('mails.services.assignPackage.subject'),
            text: res.__('mails.services.assignPackage.text', {
              user: user.firstName
            }),
            html: res.__('mails.services.assignPackage.html.enjoy', {
              plan: plan.name
            })
          })

          return res.status(201).json({
            message: 'Package assigned succesfully',
            response: pack,
            statusCode: 201
          })
        }

        throw new NotFoundException(res.__('errors.Plan Not Found'))
      }
      throw new NotFoundException(res.__('errors.Plan Not Found'))
    }
    throw new NotFoundException(res.__('errors.User Not Found'))
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async create(req, res) {
    const { planId } = req.query

    const { paymentMethodId, requiresAction, cancel } = req.body

    const expirationDate = this.configService.getPackageExpirationDate()

    const data = await this.packagesService.createTransactionablePackage(
      {
        code: {
          paymentMethodId
        },
        plan: {
          id: planId
        },
        user: req.user,
        expirationDate
      },
      requiresAction,
      cancel
    )

    if (data.cancelled) {
      this.logger.error('PaymentIntentController', { cancelled: true })

      return res.status(500).json({
        response: {
          ...data,
          details: 'Payment process has been cancelled'
        },
        statusCode: 500
      })
    }

    if (data.error) {
      this.logger.error('PaymentIntentController', { error: true })

      return res.status(500).json({
        response: data,
        statusCode: 500
      })
    }

    const user = req.user

    if (data.plan) {
      await this.mailService.sendMail({
        from: sendgridConfig.email,
        to: user.email,
        subject: res.__('mails.services.createPackage.subject'),
        text: res.__('mails.services.createPackage.text', {
          user: user.firstName
        }),
        html: `
          <div>
            ${res.__('mails.services.createPackage.html.confirm')} ${
          data.plan.name
        }
            ${res.__('mails.services.createPackage.html.practice')}
            ${res.__('mails.services.createPackage.html.access')} <a href="${
          sendgridConfig.domain
        }">${sendgridConfig.domain}</a>
            ${res.__('mails.services.createPackage.html.must')}
            <strong>B1B2Top AptisGo</strong>
          </div>`
      })
    }

    return res.status(201).json({
      message: 'Package created succesfully',
      response: {
        ...data,
        intent: requiresAction
          ? undefined
          : StripeService.generatePaymentResponse(data.intent)
      },
      statusCode: 201
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getAll(req, res) {
    const { active } = req.query

    const packages = await this.packagesService.getAll({
      isActive: active,
      userId: req.user.id
    })

    return res.status(200).json({
      message: 'Packages obtained succesfully',
      response: packages,
      statusCode: 200
    })
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async update(req, res) {
    const { type, category: value } = req.query

    const { progress, needsRevision } = req.body

    const user = req.user

    if (
      type.toLowerCase() === 'writings' &&
      type.toLowerCase() === 'speakings'
    ) {
      throw new NotFoundException(
        'Bad request type be speakings or writings only'
      )
    }

    const category = await this.categoriesService.getOne({
      name: value
    })

    const packages = await this.packagesService.getAll({
      userId: user.id,
      isActive: true
    })

    const examJSON = JSON.stringify(progress.progressUpdated)

    if (category) {
      if (needsRevision) {
        const active = await this.packagesService.getActiveSubscription({
          userId: user.id,
          competence: type
        })

        if (active) {
          const context = await this.packagesService.updateAndCreateEvaluation({
            user,
            category,
            progress: {
              id: progress.id,
              examJSON
            },
            package: active,
            type
          })

          if (context.transactionError) {
            throw new TransactionError(context.details)
          }

          return res.status(201).json({
            packages,
            response: {
              packages,
              evaluation: context.evaluation,
              package: context.update
            },
            statusCode: 201
          })
        } else {
          throw new PaymentException({
            response: {
              feedback: true
            }
          })
        }
      }

      const update = await this.progressService.updateOne({
        id: progress.id,
        examJSON
      })

      return res.status(200).json({
        response: {
          packages,
          progress: update
        }
      })
    }
  }
}

export { PackagesController }

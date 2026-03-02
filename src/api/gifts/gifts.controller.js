
import { MailService } from 'api/mails/mails.service'
import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { GiftsService } from './gifts.service'
import { UsersService } from 'api/users/users.service'
import { PlansService } from 'api/plans/plans.service'
import { StripeService } from 'api/stripe/stripe.service'
import { NotFoundException, TransactionError } from 'exceptions'

export class GiftsController {
  constructor() {
    this.giftsService = new GiftsService()
    this.usersService = new UsersService()
    this.plansService = new PlansService()
    this.mailService = new MailService()

    this.logger = Logger.Service
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async create(req, res) {
    const { email, paymentMethod, requiresAction } = req.body

    const { planId } = req.query

    const plan = await this.plansService.getOne({ id: planId })

    /**
     * Friends refers to the user sharing the gift.
     */
    const friend = await this.usersService.getOne({ id: req.user.id })

    if (friend && plan) {
      const gift = await this.giftsService.createTransactionableGift(
        {
          gifter: friend,
          plan,
          user: {
            email
          },
          stripe: {
            paymentMethod
          }
        },
        requiresAction
      )

      if (gift.transactionError) {
        throw new TransactionError()
      }

      await this.mailService.sendMail({
        to: gift.gift.email,
        subject: res.__('mails.services.gift.to.subject'),
        text: res.__('mails.services.gift.to.text', { user: gift.email }),
        html: `
        <div>
        
          <p>
            ${res.__('mails.services.gift.to.html.invite', {
              user: friend.firstName
            })}
            
            ${res.__('mails.services.gift.to.html.steps.1')}
            ${res.__('mails.services.gift.to.html.steps.2')}
            ${res.__('mails.services.gift.to.html.steps.3')}
            ${res.__('mails.services.gift.to.html.steps.4')}
            <br>
            ${res.__('mails.services.gift.to.html.code')}
            <strong style="font-size: 20px">
              ${gift.serial}
            </strong>
            ${res.__('mails.services.gift.to.html.steps.5')}
          </p>
          ${res.__('mails.services.gift.to.html.team')}
        </div>
      `
      })

      await this.mailService.sendMail({
        to: friend.email,
        subject: res.__('mails.services.gift.from.subject'),
        text: res.__('mails.services.gift.from.text', {
          user: friend.firstName
        }),
        html: `
        <div>
          <p>
            ${res.__('mails.services.gift.from.html.gift')}
            ${res.__('mails.services.gift.from.html.community')}
          </p>
        </div>
      `
      })

      return res.status(201).json({
        message: 'Gift created succesfully',
        response: {
          ...gift,
          intent: requiresAction ? undefined : StripeService.generatePaymentResponse(gift.intent)
        },
        statusCode: 201
      })
    }

    throw new NotFoundException(res.__('errors.User or plan not found'))
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async exchangeGift(req, res) {
    const { code } = req.query

    const gift = await this.giftsService.getOne({ serial: code })
    this.logger.debug('gift', gift)

    if (!gift) {
      throw new NotFoundException(
        res.__('errors.The Serial is invalid or the Gift does not exist')
      )
    }

    if (gift.expired) {
      return res.status(410).json({
        message:
          res.__('errors.The code has expired and the resource is no longer available'),
        statusCode: 410
      })
    }

    const user = await this.usersService.getOne({ email: gift.email })
    this.logger.debug('user', user)

    if (!user) {
      this.logger.debug('User not found')
      throw new NotFoundException(res.__('errors.The user is invalid or does not exist'))
    }

    const userPackage = await this.giftsService.giftExchangeTransaction(
      gift,
      user
    )

    if (userPackage.transactionError) {
      throw new TransactionError()
    }

    return res.status(201).json({
      message: 'Gift has been exchanged succesfully',
      response: userPackage,
      statusCode: 201
    })
  }
}

import { checkSchema } from 'express-validator'
import { ConfigService } from 'api/config/config.service'

class Auth {
  /**
   * @param {{ schemas?: []}}
   */
  constructor() {
    this.configService = new ConfigService()
  }
  /**
   * @param {Request} req
   * @param {Response} res
   */
  get signUp() {
    const { nameOptions } = this.configService

    return checkSchema({
      email: {
        in: 'body',
        isEmail: true,
        isLength: nameOptions
      },
      firstName: {
        in: 'body',
        isString: true,
        isLength: nameOptions
      },
      lastName: {
        in: 'body',
        isString: true,
        isLength: nameOptions
      },
      password: {
        in: 'body',
        isString: true,
        isLength: nameOptions
      }
    })
  }

  /**
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  get signIn() {
    const { passwordOptions } = this.configService

    return checkSchema({
      email: {
        in: 'body',
        errorMessage: 'Email is required',
        isEmail: true
      },
      password: {
        in: 'body',
        errorMessage: 'Password is required',
        isString: true,
        isLength: passwordOptions
      }
    })
  }

  /**
   * @param {Request} req
   * @param {Response} _res
   * @param {Function} next
   */
  get googleLogin() {
    const { nameOptions } = this.configService

    return checkSchema({
      givenName: {
        in: 'body',
        errorMessage: 'givenName is required',
        isString: true,
        isLength: nameOptions
      },
      familyName: {
        in: 'body',
        errorMessage: 'familyName is required',
        isString: true,
        isLength: nameOptions,
        optional: true
      },
      googleId: {
        in: 'body',
        errorMessage: 'googleId is required',
        isString: true
      },
      imageUrl: {
        in: 'body',
        errorMessage: 'imageUrl should be a valid string',
        isString: true,
        optional: true
      }
    })
  }

  /**
   * @param {Request} req
   * @param {Response} _res
   * @param {Function} next
   */
  get facebookLogin() {
    const { nameOptions } = this.configService

    return checkSchema({
      givenName: {
        in: 'body',
        errorMessage: 'givenName is required',
        isString: true,
        isLength: nameOptions
      },
      familyName: {
        in: 'body',
        errorMessage: 'familyName is required',
        isString: true,
        isLength: nameOptions,
        optional: true
      },
      facebookId: {
        in: 'body',
        errorMessage: 'facebookId is required',
        isString: true
      },
      imageUrl: {
        in: 'body',
        errorMessage: 'imageUrl should be a valid string',
        isString: true,
        optional: true
      }
    })
  }

  get verifiy() {
    return checkSchema({
      code: {
        in: 'query',
        errorMessage: 'Code is required',
        isString: true
      }
    })
  }

  /**
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  get forgot() {
    return checkSchema({
      email: {
        in: 'query',
        errorMessage: 'Email is required',
        isEmail: true
      }
    })
  }

  get refresh() {
    return checkSchema({
      token: {
        in: 'body',
        errorMessage: 'Token is required',
        isString: true
      }
    })
  }


  get reset () {
    const { passwordOptions } = this.configService

    return checkSchema({
      code: {
        in: 'body',
        isJWT: true
      },
      password: {
        in: 'body',
        errorMessage: 'Password is required',
        isString: true,
        isLength: passwordOptions
      }
    })
  }
}

export const pipe = new Auth({})

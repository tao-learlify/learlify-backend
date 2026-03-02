import { ConfigService } from 'api/config/config.service'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import generator from 'generate-password'
import { Injectable } from 'decorators'

@Injectable
class AuthenticationService {
  constructor() {
    this.configService = new ConfigService()
    this.decrypt = this.decrypt.bind(this)
    this.encrypt = this.encrypt.bind(this)
    this.hash = this.hash.bind(this)
  }

  /**
   * @param {string} value
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async compareHash(value, hash) {
    return bcrypt.compare(value, hash)
  }

  /**
   * @param {{}} payload
   * @returns {{}}
   */
  decrypt(payload) {
    const { provider } = this.configService

    return jwt.verify(payload, provider.JWT_SECRET, (err, decode) => {
      if (err) {
        this.logger.error(err)

        return {
          error: true,
          details: err
        }
      }
      return decode
    })
  }

  /**
   * @param {{}} payload
   * @param {{ clientConfig?: boolean, encryptOptions?: {} }}
   * @returns {string}
   */
  encrypt(
    payload,
    { clientConfig, encryptOptions } = {
      clientConfig: null,
      encryptOptions: null
    }
  ) {
    const { provider } = this.configService

    if (clientConfig) {
      delete payload.password
      delete payload.stripeCustomerId
      delete payload.googleId
      delete payload.facebookId

      return jwt.sign(payload, provider.JWT_SECRET, {
        expiresIn: provider.JWT_EXPIRATION
      })
    }

    if (encryptOptions) {
      return jwt.sign(payload, provider.JWT_SECRET, encryptOptions)
    }

    return jwt.sign(payload, provider.JWT_SECRET, {
      expiresIn: provider.JWT_EXPIRATION
    })
  }

  /**
   * @param {{ useHash?: boolean }}
   */
  async generateRandomPassword({ useHash }) {
    const password = generator.generate({
      uppercase: true,
      length: 8
    })

    return {
      value: password,
      hash: useHash ? await this.hash(password) : null
    }
  }

  /**
   * @param {string} value
   * @returns {Promise<string>}
   */
  async hash(value) {
    const { provider } = this.configService

    return bcrypt.hash(value, provider.STRONG_HASH)
  }
}

export { AuthenticationService }

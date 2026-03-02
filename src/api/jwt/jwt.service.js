import jwt from 'jsonwebtoken'
import { ConfigService } from 'api/config/config.service'

const scopedSecretKey = Symbol('secretKey')

 class JWTService {
  constructor () {
    this.jwtProvider = jwt
    this[scopedSecretKey] = new ConfigService().provider.JWT_SECRET
  }

  /**
   * @param {{}} payload
   */
  sign (payload) {
    return this.jwtProvider.sign(payload, this[scopedSecretKey])
  }
}

export { JWTService }
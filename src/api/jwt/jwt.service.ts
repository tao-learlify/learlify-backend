import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { ConfigService } from 'api/config/config.service'

const scopedSecretKey = Symbol('secretKey')

type PrivateStore = {
  [scopedSecretKey]: string
}

class JWTService {
  private jwtProvider: typeof jwt

  constructor() {
    this.jwtProvider = jwt
    ;(this as unknown as PrivateStore)[scopedSecretKey] = new ConfigService().provider.JWT_SECRET
  }

  sign(payload: Record<string, unknown>): string {
    const secret = (this as unknown as PrivateStore)[scopedSecretKey]
    const expiration = new ConfigService().provider.JWT_EXPIRATION
    return this.jwtProvider.sign(payload, secret, { expiresIn: expiration } as SignOptions)
  }
}

export { JWTService }

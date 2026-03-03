import type { Request } from 'express'
import { Strategy, ExtractJwt, VerifiedCallback } from 'passport-jwt'
import type { JwtPayload } from 'jsonwebtoken'
import { ConfigService } from 'api/config/config.service'
import { UsersService } from 'api/users/users.service'
import { Logger } from 'api/logger'
import { isTokenBlocked } from './jwt.blocklist'

type JwtUserPayload = JwtPayload & { id: number }

const { provider } = new ConfigService()
const { getOne } = new UsersService() as unknown as {
  getOne: (opts: { id: number }) => Promise<{
    id: number
    email: string
    firstName: string
    lastName: string
    role: string
    googleId?: string
    facebookId?: string
    stripeCustomerId?: string
    lastLogin?: string
  } | undefined>
}

const extractor = ExtractJwt.fromAuthHeaderAsBearerToken()

const JsonWebTokenGuard = new Strategy(
  {
    secretOrKey: provider.JWT_SECRET,
    jwtFromRequest: extractor,
    passReqToCallback: true,
    algorithms: ['HS256']
  },
  async (req: Request, payload: JwtUserPayload, done: VerifiedCallback) => {
    try {
      const rawToken = extractor(req)

      if (rawToken) {
        const blocked = await isTokenBlocked(rawToken)
        if (blocked) {
          Logger.Service.warn('jwt.guard.blocklisted', { id: payload.id })
          return done(null, false)
        }
      }

      const user = await getOne({ id: payload.id })

      if (user) {
        Logger.Service.info('Request: Authenticated', { id: user.id })

        return done(null, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          id: user.id,
          googleId: user.googleId,
          facebookId: user.facebookId,
          stripeCustomerId: user.stripeCustomerId,
          lastLogin: user.lastLogin
        })
      }

      return done(null, false)
    } catch (err) {
      Logger.Service.error('Unauthorized Request.', err)
      return done(err as Error)
    }
  }
)

export default JsonWebTokenGuard

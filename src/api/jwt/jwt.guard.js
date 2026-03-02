import { Strategy, ExtractJwt } from 'passport-jwt'
import { ConfigService } from 'api/config/config.service'
import { UsersService } from 'api/users/users.service'
import { Logger } from 'api/logger'

const { provider } = new ConfigService()
const { getOne } = new UsersService()

const JsonWebTokenGuard = new Strategy(
  {
    secretOrKey: provider.JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
  },
  (payload, done) => {
    getOne({ id: payload.id })
      .then(user => {
        if (user) {
          Logger.Service.info('Request: Authenticated', { id: user.id })

          done(null, {  
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
          return
        }
        done(null, false)

        return
      })
      .catch(err => {
        Logger.Service.error('Unauthorized Request.', err)

        done(err)

        return
      })
  }
)

export default JsonWebTokenGuard

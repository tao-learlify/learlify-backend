import type { Knex } from '@types'
import type { CreateUserInput } from './admin.types'
import User from 'api/users/users.model'

export class AdminService {
  createUser(user: CreateUserInput, trx?: Knex.Transaction) {
    const transaction = Object.assign({}, user, { isVerified: true })

    return User.query(trx).insertAndFetch(transaction as unknown as Record<string, unknown>)
  }

  async userExist(email: string): Promise<boolean> {
    const user = await User.query().findOne({
      email
    })

    return Boolean(user)
  }
}

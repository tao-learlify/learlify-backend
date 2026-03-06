import path from 'path'
import dotenv from 'dotenv'
import type { Knex } from 'knex'

type MysqlFieldLike = {
  type: string
  length: number
  string(): string | null
}

type MysqlNextLike = () => unknown

// Solo cargar .env en desarrollo - Railway inyecta variables directamente
if (process.env.NODE_ENV !== 'production') {
  const dotenvPath =
    process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../.env')
  dotenv.config({ path: dotenvPath })
}

const connection = {
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8',
  timezone: 'UTC',
  typeCast(field: MysqlFieldLike, next: MysqlNextLike): unknown {
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string()

      return value ? value === '1' : null
    }

    return next()
  }
}

const knexConfig: Knex.Config = {
  connection: connection as unknown as Knex.StaticConnectionConfig,
  client: process.env.DB_CLIENT as string,
  migrations: {
    tableName: 'migrations',
    directory: '../migrations'
  },
  seeds: {
    directory: '../seeds'
  }
}

export default knexConfig

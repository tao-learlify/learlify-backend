import type { Router } from 'express'
import type { Knex } from 'knex'

export interface HttpConsumer {
  handlers: Router
  route: string
}

export interface ConfigurationProvider {
  APP_HOST: string
  APP_PORT: number
  AWS_ACCESS_KEY: string
  AWS_SECRET_KEY: string
  CLOUDFRONT_NETWORK: string
  CONSOLE_LOG_LEVEL: 'debug'
  FILE_LOG_LEVEL: string
  JWT_EXPIRATION: string
  JWT_SECRET: string
  PAGINATION_LIMIT: number
  SENDGRID_APTIS_ACADEMY: string
  SENDGRID_APTIS_EMAIL: string
  SENDGRIND_API_KEY: string
  STRIPE_API_KEY: string
  STRONG_HASH: number
  TWILIO_API_ACCOUNT_SID: string
  TWILIO_API_KEY_SECRET: string
  TWILIO_API_KEY_SID: string
  TZ: string
  uniqid: string
}

export type { Knex }

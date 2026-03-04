import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(3100),

  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_CLIENT: z.string().default('mysql2'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('30d'),

  STRONG_HASH: z.coerce.number().default(10),
  PAGINATION_LIMIT: z.coerce.number().default(10),

  SENDGRID_API_KEY: z.string().optional(),
  SENDGRIND_API_KEY: z.string().optional(),
  STRIPE_API_KEY: z.string().optional(),

  AWS_ACCESS_KEY: z.string().optional(),
  AWS_SECRET_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_BUCKET: z.string().optional(),
  AWS_TEST_BUCKET: z.string().optional(),
  CLOUDFRONT_NETWORK: z.string().optional(),

  REDIS_URL: z.string().optional(),

  TWILIO_API_ACCOUNT_SID: z.string().optional(),
  TWILIO_API_KEY_SECRET: z.string().optional(),
  TWILIO_API_KEY_SID: z.string().optional(),

  SSL_CERT: z.string().optional(),
  SSL_SECRET: z.string().optional(),
  USE_WIRELESS_CONFIG: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  globalThis.console.error('[env] Invalid environment variables:')
  globalThis.console.error(JSON.stringify(parsed.error.format(), null, 2))
  process.exit(1)
}

export const env: Env = parsed.data

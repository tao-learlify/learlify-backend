import { MODE } from 'common/process'
import dotenv from 'dotenv'

dotenv.config()

const enviroment = process.env.NODE_ENV || 'development'

/* Base config for the app, it will be overriden by the specific config
for the enviroment that that the app is being executed in. */
const config = {
  APP_HOST: process.env.HOST || 'localhost',
  APP_PORT: process.env.PORT || 3100,
  AWS_BUCKET: enviroment === 'development' ? process.env.AWS_TEST_BUCKET : process.env.AWS_BUCKET,
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
  CLOUDFRONT_NETWORK: process.env.CLOUDFRONT_NETWORK,
  CONSOLE_LOG_LEVEL: 'debug',
  DATE_FORMAT: 'YYYY-MM-DD HH:mm',
  TIMEZONE_FORMAT: 'YYYY-MM-DD',
  DISABLE_LOGS: enviroment === MODE.development,
  FILE_LOG_LEVEL: 'info',
  HTTPS_APP_HOST: 'localhost',
  HTTPS_PORT: 3100,
  JWT_EXPIRATION: '30d',
  JWT_SECRET: process.env.JWT_SECRET,
  PAGINATION_LIMIT: 10,
  SENDGRID_APTIS_ACADEMY: 'academyb1b2@gmail.com',
  SENDGRID_APTIS_EMAIL: 'aptisgo@noreply',
  SENDGRIND_API_KEY: process.env.SENDGRIND_API_KEY,
  SSL_CERT: process.env.SSL_CERT,
  SSL_SECRET: process.env.SSL_SECRET,
  STRIPE_API_KEY: process.env.STRIPE_API_KEY,
  STRONG_HASH: 10,
  TWILIO_API_ACCOUNT_SID: process.env.TWILIO_API_ACCOUNT_SID,
  TWILIO_API_KEY_SECRET: process.env.TWILIO_API_KEY_SECRET,
  TWILIO_API_KEY_SID: process.env.TWILIO_API_KEY_SID,
  TZ: 'Europe/Madrid',
  uniqid: 'aptis-',
  USE_WIRELESS_CONFIG: Boolean(process.env.USE_WIRELESS_CONFIG),
  AUTHORIZED_ORIGINS: [
    'https://aptisgo.b1b2.es',
    'https://b1b2.online',
    'https://b1b2.top/play',
    'http://localhost:3000'
  ],
  S3: {
    BUCKET: enviroment === MODE.development ? 'aptispruebas' : 'aptisgo'
  },
  MULTIPART_FORMDATA: {
    FILESIZE: 5000000,
    ITEMS: 5,
    DISK: 'files'
  }
}

export default config

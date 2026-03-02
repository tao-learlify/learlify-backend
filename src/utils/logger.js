import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import config from '../config'

const { combine, timestamp, json, errors } = winston.format

const jsonFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  json()
)

const logger = winston.createLogger({
  transports: [
    new DailyRotateFile({
      level: 'info',
      handleExceptions: true,
      format: jsonFormat,
      dirname: `${__dirname}/../logs`,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.Console({
      level: config.disableLogs ? 'error' : 'debug',
      handleExceptions: true,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

export default logger

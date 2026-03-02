import winston from 'winston'
import config from '../config'


const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      level: 'info',
      json: true,
      handleExceptions: true,
      maxsize: 5120000,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD hh:mm'
        }),
        winston.format.printf(info => {
          const { timestamp, level, message, ...args } = info
          return `${timestamp} - ${level}: ${message} ${
            Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
          }`
        })
      ),
      filename: `${__dirname}/../logs/logs.log`
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

import type { Logger as WinstonLogger } from 'winston'
import logger from 'utils/logger'

export class Logger {
  static get Service(): WinstonLogger {
    return logger as unknown as WinstonLogger
  }
}

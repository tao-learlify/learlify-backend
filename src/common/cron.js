import { Readonly } from 'decorators'
import { Logger } from 'api/logger'

class Scheduler {
  /**
   * @typedef {Object} CronProperties
   * @property {[]} triggers
   * @param {CronProperties} props
   */
  constructor(props) {
    this.logger = Logger.Service
    this.triggers = props.triggers
  }

  @Readonly
  execute() {
    this.logger.debug('scheduleAsyncTask: running', Scheduler.name)

    for (const index in this.triggers) {
      const [AsyncTask, methods] = this.triggers[index]

      const asyncTask = new AsyncTask()

      methods.forEach(method => {
        if (asyncTask?.[method]) {
          asyncTask[method]()
        }
      })
    }
  }
}


/**
 * @typedef {Object} CronExpression
 * @property {number} hours
 * @property {number} minutes
 */


const sync = {
  /**
   * 
   * @param {CronExpression}
   */
  every () {
    return'* * * * *'
  }

}


export {
  Scheduler,
  sync
}

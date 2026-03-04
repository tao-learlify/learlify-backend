import { Readonly } from 'decorators'
import { Logger } from 'api/logger'

type AsyncTaskMethod = () => unknown

type AsyncTaskConstructor = new () => object

type TaskTrigger = [AsyncTaskConstructor, string[]]

type CronProperties = {
  triggers: TaskTrigger[]
}

class Scheduler {
  private logger: typeof Logger.Service
  private triggers: TaskTrigger[]

  constructor(props: CronProperties) {
    this.logger = Logger.Service
    this.triggers = props.triggers
  }

  @Readonly
  public execute(): void {
    this.logger.debug('scheduleAsyncTask: running', Scheduler.name)

    for (const index in this.triggers) {
      const [AsyncTask, methods] = this.triggers[index]
      const asyncTask = new AsyncTask() as Record<string, unknown>

      methods.forEach((method: string) => {
        const selectedMethod = asyncTask?.[method]

        if (typeof selectedMethod === 'function') {
          const methodToExecute = selectedMethod as AsyncTaskMethod
          methodToExecute.call(asyncTask)
        }
      })
    }
  }
}

type CronExpression = {
  hours: number
  minutes: number
}

const sync = {
  every(_expression?: CronExpression): string {
    void _expression
    return '* * * * *'
  }
}

export { Scheduler, sync }

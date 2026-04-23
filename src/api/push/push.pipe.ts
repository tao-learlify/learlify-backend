import { checkSchema, Schema } from 'express-validator'

class PushPipe {
  get subscribe(): ReturnType<typeof checkSchema> {
    return checkSchema({
      endpoint: { in: ['body'], isString: true, notEmpty: true },
      p256dh: { in: ['body'], isString: true, notEmpty: true },
      auth: { in: ['body'], isString: true, notEmpty: true }
    } as Schema)
  }

  get unsubscribe(): ReturnType<typeof checkSchema> {
    return checkSchema({
      endpoint: { in: ['body'], isString: true, notEmpty: true }
    } as Schema)
  }
}

export const pipe = new PushPipe()

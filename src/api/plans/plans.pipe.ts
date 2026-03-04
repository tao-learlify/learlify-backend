import { checkSchema } from 'express-validator'

export class PlansPipe {
  get getAll(): ReturnType<typeof checkSchema> {
    return checkSchema({
      offers: {
        in: 'query',
        isBoolean: true,
        optional: true
      },
      model: {
        in: 'query',
        isString: true
      },
      pricing: {
        in: 'query',
        isBoolean: true,
        optional: true
      }
    })
  }

  get update(): ReturnType<typeof checkSchema> {
    return checkSchema({
      available: {
        in: 'body',
        isBoolean: true,
        optional: true
      },
      classes: {
        in: 'body',
        isInt: true,
        toInt: true,
        optional: true
      },
      currency: {
        in: 'body',
        notEmpty: true,
        optional: true
      },
      description: {
        in: 'body',
        optional: true
      },
      feature: {
        in: 'body',
        isIn: {
          options: [['COURSES', 'CLASSES', 'EXAMS']]
        },
        optional: true
      },
      modelId: {
        in: 'body',
        isInt: true,
        toInt: true,
        optional: true
      },
      name: {
        in: 'body',
        optional: true
      },
      planId: {
        in: 'body',
        isNumeric: true,
        errorMessage: 'planId is required'
      },
      price: {
        in: 'body',
        isInt: true,
        toInt: true,
        optional: true
      },
      speaking: {
        in: 'body',
        isInt: true,
        toInt: true,
        optional: true
      },
      writing: {
        in: 'body',
        isInt: true,
        toInt: true,
        optional: true
      }
    })
  }

  get findOne(): ReturnType<typeof checkSchema> {
    return checkSchema({
      id: {
        in: 'params',
        isNumeric: true,
        toInt: true
      }
    })
  }

  get create(): ReturnType<typeof checkSchema> {
    return checkSchema({
      available: {
        in: 'body',
        isBoolean: true
      },
      classes: {
        in: 'body',
        isInt: true,
        toInt: true
      },
      currency: {
        in: 'body',
        notEmpty: true
      },
      description: {
        in: 'body',
        optional: true
      },
      feature: {
        in: 'body',
        isIn: {
          options: [['COURSES', 'CLASSES', 'EXAMS']]
        }
      },
      modelId: {
        in: 'body',
        isInt: true,
        toInt: true,
        optional: true
      },
      name: {
        in: 'body',
        notEmpty: true
      },
      price: {
        in: 'body',
        isInt: true,
        toInt: true
      },
      speaking: {
        in: 'body',
        isInt: true,
        toInt: true
      },
      writing: {
        in: 'body',
        isInt: true,
        toInt: true
      }
    })
  }

  get remove(): ReturnType<typeof checkSchema> {
    return checkSchema({})
  }
}

export const pipe = new PlansPipe()

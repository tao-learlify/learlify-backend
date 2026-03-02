import Joi from 'joi'

export class Validator {
  /**
   * @param {{}} body
   * @param {SchemaLike} schemaLike
   * @returns {Promise<void>}
   */
  static schema(body, schemaLike) {
    return Joi.validate(body, schemaLike)
  }

  /**
   * @param {SchemaMap} keys
   */
  static createSchema(keys) {
    return Joi.object().keys(keys)
  }

  static get accessLibrary() {
    return Joi
  }

  static get types() {
    return {
      number: 'number',
      string: 'string',
      boolean: 'boolean'
    }
  }

  /**
   *
   * @param {{ value?: any, type: 'string' | 'number' | 'boolean' }} params
   */
  static transform({ value, type }) {
    const isArray = Array.isArray(value)

    switch (type) {
      case 'number':
        return isArray
          ? value.map(pipe => ({
              value: Number.parseInt(pipe),
              type: 'number'
            }))
          : {
              value: Number.parseInt(value),
              type: 'number'
            }

      case 'string':
        return isArray
          ? value.map(pipe => ({
              value: pipe.toString(),
              type: 'string'
            }))
          : {
              value: value.toString(),
              type: 'string'
            }

      case 'boolean':
        return {
          value: Boolean(value),
          type: 'boolean'
        }

      default:
        return value
    }
  }

  static through({ value, type }) {
    const isArray = Array.isArray(value)

    if (type === 'number') {
      return isArray
        ? value.every(
            pipe => typeof pipe.value === 'number' && !Number.isNaN(pipe.value)
          )
        : typeof value === 'number' && !Number.isNaN(value)
    }

    if (type === 'string') {
      return typeof value === 'string'
    }

    if (type === 'boolean') {
      return typeof value === 'boolean'
    }
  }
}

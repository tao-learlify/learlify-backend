import { MODE } from 'common/process'
import { v4 as UUID } from 'uuid'
import moment from 'moment'

/**
 * @param {{ limit?: number, page?: number, total?: number, limit?: number }} paginationStack
 */
export function createPaginationStack(paginationStack) {
  const lastPage = Math.ceil(paginationStack.total / paginationStack.limit)

  /**
   * @description
   * Making ternary operator to reduce a innecesary operation.
   */
  const page =
    typeof paginationStack.page === 'string'
      ? parseInt(paginationStack.page)
      : paginationStack.page

  return {
    currentPage: page,
    /**
     * I don't fucking know what is this!!!
     * But you got this. @luisvilchez
     */
    hasNext: page >= lastPage ? false : true,
    limit: paginationStack.limit,
    total: paginationStack.total
  }
}

/**
 * @param {[]} models
 * @returns {boolean}
 */
export function exist(models) {
  if (models.every(model => model)) {
    return true
  }
  throw new Error('Undefined values included')
}

/**
 * @param {string} filename
 */
export function generateDateFileName(filename) {
  return `${UUID()}-${filename}`
}

export function sanitizeFile(file, callback) {
  const audioMimeType = 'audio/'
  const jsonMimeType = 'application/json'

  const isAllowedMimeType =
    file.mimetype.startsWith(audioMimeType) ||
    file.mimetype.startsWith(jsonMimeType)
  if (isAllowedMimeType) {
    return callback(null, true)
  }
  callback('Mimetype is not allowed.')
}

export function isValidDate(value) {
  const isDate = moment(value).isValid()

  if (!isDate) {
    return Promise.reject('Is not date')
  }
}

/**
 * @param {[]} arr
 */
export function getAllElementExceptLast(arr) {
  return [...arr].slice(0, arr.length - 1)
}

/**
 * @param {string} url
 */
export function cloudfrontURL(url) {
  return 'exams/' + url
}

/**
 *
 * @param {[]} schema
 * @param {string} value
 */
export function getSchemaIndex(schema, value) {
  return schema.find(context => {
    return context.category === value
  })
}

/**
 * @param {string} familyName
 */
export function analyzeFamilyName(familyName) {
  if (familyName) {
    if (familyName.length < 2) {
      return 'AptisGo'
    }
    return familyName
  }
  return 'AptisGo'
}

/**
 * @description
 * Purpose on this function is eval that logs can't be showed up
 * If a testing is running to make less verbose.
 */
export function isRunningOnProductionOrDevelopment() {
  return (
    process.env.NODE_ENV === MODE.production ||
    process.env.NODE_ENV === MODE.development
  )
}

/**
 * @param {{ data: JSON, parse: boolean, key: string }}
 */
export function parseContent({ data, key }) {
  const content = JSON.parse(data)

  return key
    ? content.schema.find(value => value.category === key)
    : content.schema
}

/**
 * @param {{ version: string, dir: string }}
 */
export function build({ version, dir }) {
  return `exams/${version}/${dir}`
}

export function sum(accumulator, currentValue) {
  // eslint-disable-next-line no-console
  console.log(accumulator, currentValue)

  return accumulator + currentValue
}

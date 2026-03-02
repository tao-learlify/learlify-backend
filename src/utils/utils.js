import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import generator from 'generate-password'

import config from '../config'

/**
 * Hashes the given value  using bcrypt and a fixed number of salt rounds.
 * @param {string} value
 * @returns {Promise<string>}
 */
export async function hash(value) {
  const saltRounds = 10

  const hash = await new Promise((resolve, reject) => {
    bcrypt.hash(value, saltRounds, function(err, encrypted) {
      return err ? reject(err) : resolve(encrypted)
    })
  })

  return hash
}

/**
 * Compares the given password with the actual user password to know
 * if they're the same
 * @param {string} passwordFromReq
 * @param {string} passwordFromDB
 * @returns {Promise<boolean>}
 */
export async function comparePasswords(passwordFromReq, passwordFromDB) {
  return bcrypt.compareSync(passwordFromReq, passwordFromDB)
}

/**
 * Createa a new jwt to assign during the login process
 * @param {{}} payload
 * @returns {Promise<{}>}
 */
export const signJWT = payload => {
  return jwt.sign(payload, config.JWT_SECRET)
}

/**
 * @description
 * Creates a random password between uppercase and lower case.
 * And returns at least 8 minimum characters.
 * @returns {Promise<{ hashed: string, password: string}>}
 */
export const createPassword = () => {
  const password = generator.generate({
    uppercase: true,
    length: 8
  })

  return new Promise((resolve, reject) => {
    hash(password)
      .then(hashed => resolve({ password, hashed }))
      .catch(err => reject(err))
  })
}

export function answerSchema(schema, callback) {
  schema.forEach(({ answers }, schemaIndex) => {
    answers.forEach((answer, index) => {
      callback({ title: answer, iteratorIndex: index, schemaIndex })
    })
  })
}

export function orderAs(a, b) {
  return a.orderAs - b.orderAs
}

/**
 * @description
 * Checking that array is empty.
 * @param {[]} arr
 * @returns {boolean} 
 */
export function emptyArray(arr) {
  if (typeof arr !== 'object') {
    return true
  }
  return arr.length === 0
}

/**
 * @param {number} value 
 * @returns {Function}
 */
export function fromUnits(value, callback) {
  const units = Array(value).fill(null)
  return callback(units)
}


/**
 * @description
 * Obtains the category id passing name as category argument.
 * @param {string} category 
 * @param {[]} categories 
 */
export function getCategoryId(category, categories) {
  const lastFound = categories.find(value => value.name === category)

  return lastFound.id
} 


/**
 * @example
 * fileNameNumber('index', 1, 'json')
 * @param {string} alias 
 * @param {number} id
 * @param {string} ext
 * @returns {string}
 */
export function createFileName (alias, id, ext) {
  return `${alias}-${id}.${ext}`
}


/**
 * Get the exams requeriments only for data fetching.
 * @param {RegExp} expression 
 * @param {[]} packages 
 * @param {string} role 
 */
export function examRequirements (expression, packages) {
  const freeExamNameExpression = /^\bExam 1\b$/

  return !freeExamNameExpression.test(expression) && packages.length === 0
}

/**
 * Get the client data with no confidential information.
 * @param {{}} user
 * @returns {{}} 
 */
export function getUserClientData (user) {
  const {
    password,
    updatedAt,
    createdAt,
    roleId,
    stripeCustomerId,
    lastLogin,
    googleId,
    facebookId,
    hasActivePackages,
    ...client
  } = user

  return client
}
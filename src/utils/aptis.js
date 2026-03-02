import { randomUUID } from 'crypto'
import config from '../config'

/**
 * @description
 * Generates a unique random hexadecimal code.
 * @returns {string}
 */
export function keyGenerator() {
  return `${config.uniqid}${randomUUID()}`
}
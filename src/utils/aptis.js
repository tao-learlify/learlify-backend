import uniqid from 'uniqid'
import config from '../config'

/**
 * @description
 * Generates a unique random hexadecimal code.
 * @returns {string}
 */
export function keyGenerator() {
  return uniqid.process(config.uniqid)
}
import sgMail from '@sendgrid/mail'
import { MODE } from 'common/process'

/**
 * @see https://sendgrid.com/docs/for-developers/sending-email/v3-nodejs-code-example/
 */

/**
 * @description Takes these arguments and returns a promise sending an email.
 * @param {{ to: string, from: string, subject: string, text: string, html: string}} msgOptions
 * @returns {Promise<any>}
 */
export default function sendgridService(msgOptions) {
  if (process.env.NODE_ENV === MODE.development) {
    Object.assign(msgOptions, {
      to: process.env.EMAIL_DEVELOPMENT || 'andersonav37@gmail.com'
    })
  }
  return new Promise(resolve => {
    sgMail.send(msgOptions).then(resolve).catch(resolve)
  })
}

export const sendgridConfig = {
  email: 'aptisgo@noreply',
  domain:
    process.env.NODE_ENV === MODE.development
      ? 'http://localhost:3000'
      : 'https://play.b1b2.top'
}

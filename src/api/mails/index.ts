import sgMail from '@sendgrid/mail'
import type { MailData } from '@sendgrid/helpers/classes/mail'
import { MODE } from 'common/process'

export default function sendgridService(msgOptions: MailData): Promise<void> {
  if (process.env.NODE_ENV === MODE.development) {
    Object.assign(msgOptions, {
      to: process.env.EMAIL_DEVELOPMENT || 'andersonav37@gmail.com'
    })
  }
  return new Promise(resolve => {
    sgMail.send(msgOptions).then(() => resolve()).catch(() => resolve())
  })
}

export const sendgridConfig = {
  email: 'aptisgo@noreply',
  domain:
    process.env.NODE_ENV === MODE.development
      ? 'http://localhost:3000'
      : 'https://play.b1b2.top'
}

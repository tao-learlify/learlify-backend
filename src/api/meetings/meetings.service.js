import Twilio from 'twilio'
import Meeting from './meetings.model'
import { Bind } from 'decorators'

/**
 * @typedef {Object} Source
 * @property {number} id
 */

class MeetingsService {
  constructor() {
    this.VideoGrant = Twilio.jwt.AccessToken.VideoGrant
  }

  /**
   * @param {Source} meeting
   * @returns {Promise<Meeting>}
   */
  create(meeting) {
    return Meeting.query().insertAndFetch(meeting)
  }

  /**
   * @param {Source} meeting
   * @returns {Promise<Meeting>}
   */
  getOne(meeting) {
    return Meeting.query().findOne(meeting)
  }

  /**
   *
   * @param {Source} meeting
   */
  getActiveMeetings(meeting) {
    return Meeting.query()
      .withGraphJoined('[classes.[schedule(activeFields)], user(withName)]')
      .where(meeting)
      .andWhere('classes.expired', false)
  }

  /**
   * @param {Source} meeting
   * @param {{}} options
   * @returns {Promise<Meeting>}
   */
  update(meeting, options) {
    return Meeting.query().updateAndFetch(meeting).where(options)
  }

  /**
   * @param {string} username
   * @param {string} roonName
   * @returns {{ identity?: string, token?: string }}
   */
  @Bind
  joinMeeting(username, roonName) {
    const token = new Twilio.jwt.AccessToken(
      process.env.TWILIO_API_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET
    )

    Object.assign(token, { identity: username })

    const streamingRoom = new this.VideoGrant({
      room: roonName
    })

    token.addGrant(streamingRoom)

    return {
      token: token.toJwt(),
      identity: Buffer.from(username, 'utf-8').toString('base64')
    }
  }
}

export { MeetingsService }

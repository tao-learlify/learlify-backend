import Twilio from 'twilio'
import Meeting from './meetings.model'
import { Bind } from 'decorators'
import type { MeetingSource, JoinMeetingResult } from './meetings.types'

class MeetingsService {
  private VideoGrant: typeof Twilio.jwt.AccessToken.VideoGrant

  constructor() {
    this.VideoGrant = Twilio.jwt.AccessToken.VideoGrant
  }

  create(meeting: MeetingSource) {
    return Meeting.query().insertAndFetch(meeting)
  }

  getOne(meeting: MeetingSource) {
    return Meeting.query().findOne(meeting)
  }

  getActiveMeetings(meeting: MeetingSource) {
    return Meeting.query()
      .withGraphJoined('[classes.[schedule(activeFields)], user(withName)]')
      .where(meeting)
      .andWhere('classes.expired', false)
  }

  update(meeting: MeetingSource, options: MeetingSource) {
    return Meeting.query().updateAndFetch(meeting).where(options)
  }

  @Bind
  joinMeeting(username: string, roonName: string): JoinMeetingResult {
    const token = new Twilio.jwt.AccessToken(
      process.env.TWILIO_API_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY_SID!,
      process.env.TWILIO_API_KEY_SECRET!
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

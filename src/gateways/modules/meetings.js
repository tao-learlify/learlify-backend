import { Bind } from 'decorators'
import { Socket } from 'modules'
import { ConfigService } from 'api/config/config.service'
import { MeetingsService } from 'api/meetings/meetings.service'
import { ScheduleService } from 'api/schedule/schedule.service'
import { MEETING_STATUS } from 'gateways/events'
import { Logger } from 'api/logger'

/**
 * @description
 * This module only manages all meetings connection with sockets.
 */

/**
 * @typedef {Object} MeetingStatusPayload
 * @property {number} id
 */
class MeetingsGateway extends Socket {
  constructor() {
    super()
    this.logger = Logger.Service
    this.configService = new ConfigService()
    this.scheduleService = new ScheduleService()
    this.meetingsService = new MeetingsService()
  }

  @Bind
  main() {
    this.socket.on('connection', socket => {
      this.logger.info('MeetingsGateway: connected')

      /**
       * Send back the information if the connection is enabled yet.
       * Front end is able to enable at least 5 minutes extras before the class end.
       */
      socket.on(
        MEETING_STATUS,
        /**
         * @param {MeetingStatusPayload} payload
         */
        async payload => {
          this.logger.debug('payload', payload)

          try {
            const isStream = await this.scheduleService.getOne({
              id: payload.schedule.id,
              streaming: true
            })
  
            if (isStream) {
              this.logger.info(`${payload.room} is still having a connection in the meeting.`)

              this.socket.to(payload.room).emit(MEETING_STATUS, {
                connected: true,
                room: payload.room
              })
            } else {
              this.logger.info(`${payload.room} is not having a connection anymore in the meeting.`)

              this.socket.to(payload.room).emit(MEETING_STATUS, {
                disconnected: true,
                room: payload.room
              })
            }
          } catch (err) {
            this.logger.error(err.name)
            this.logger.error(err.stack)
          }
        }
      )
    })
  }
}

export default MeetingsGateway

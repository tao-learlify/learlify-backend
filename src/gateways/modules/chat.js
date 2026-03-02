/* eslint-disable no-console */
import { Socket } from 'modules'
import { Logger } from 'api/logger'
import {
  CHAT_MESSAGE,
  TYPING_MESSAGE,
  JOIN_CHAT_ROOM,
  FILE_ATTACH_STREAM,
  FILE_UPLOAD_STREAM
} from 'gateways/events'

/**
 * @description
 * This module is responsible of making actions to chatrooms.
 */

export default class ChatGateway extends Socket {
  constructor() {
    super()
    this.logger = Logger.Service
  }

  main() {
    this.socket.on('connection', socket => {
      this.logger.info('ChatGateway: connected')

      /**
       * @description
       * Chat Message Event.
       */
      socket.on(CHAT_MESSAGE, payload => {
        this.logger.debug('Chat Message Emited: ', {
          payload: payload.message,
          room: payload.room
        })

        socket.to(payload.room).emit(CHAT_MESSAGE, payload)
      })

      /**
       * @description
       * Typing Message Event.
       */
      socket.on(TYPING_MESSAGE, payload => {
        this.logger.debug('Typing Message Event: ', payload)

        socket.to(payload.room).emit(TYPING_MESSAGE, payload)
      })

      /**
       * @requires FILE_ATTACH_STREAM uses this event to attach a chat message with base64 file.
       * @description
       * Sends a chat message with a file event.
       */
      socket.on(FILE_UPLOAD_STREAM, payload => {
        this.logger.debug('Attaching File Event: ', payload)

        socket.to(payload.room).emit(FILE_ATTACH_STREAM, payload)
      })

      /**
       * @description
       * Joining to chatroom Event.
       */
      socket.on(JOIN_CHAT_ROOM, payload => {
        socket.join(payload.room)
        this.logger.info('Joining to '.concat(payload.room))
        this.socket.to(payload.room).emit(JOIN_CHAT_ROOM, { ping: true })
      })
    })
  }
}

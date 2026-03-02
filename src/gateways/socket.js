import { Bind } from 'decorators'
import { Logger } from 'api/logger'
import { UsersService } from 'api/users/users.service'
import { MeetingsService } from 'api/meetings/meetings.service'
import jwt from 'jsonwebtoken'
import config from '../config'
import ROOMS from './rooms'
import * as EVENT from './events'

export class WebSockets {
  /**
   * @param {{ stream: import('socket.io').Server, modules: [] }}
   */
  constructor({ stream, modules }) {
    this.stream = stream

    this.logger = Logger.Service

    this.users = new UsersService()

    this.meetings = new MeetingsService()

    this.modules = modules || []
  }

  @Bind
  connected(id) {
    return 'A client has joining to socket '.concat(id)
  }

  @Bind
  disconnected(id) {
    return 'A client has been disconnected '.concat(id)
  }

  getSessionName(session) {
    const [room] = session.classes

    return room.name
  }
  /**
   * @param {[]} modules
   */
  @Bind
  main() {
    this.logger.info('WebSockets Service Running')

    this.stream.use((socket, next) => {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token

      if (!token) {
        return next(new Error('unauthorized'))
      }

      jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) {
          return next(new Error('unauthorized'))
        }

        socket.user = decoded
        next()
      })
    })

    /**
     * @description
     * From the root we can succesfully connect all modules from socket io, to make good design patterns.
     */
    this.modules.forEach(Module => {
      const module = new Module()

      if ('main' in module) {
        module.main()
      }
    })
    /**
     * @author anderjs
     * @description
     * @see https://socket.io/get-started/chat/
     */
    this.stream.on(EVENT.CONNECTION, socket => {
      const message = this.connected(socket.id)

      this.logger.info(message)

      socket.on(EVENT.DISCONNECT, () => {
        const message = this.disconnected(socket.id)
        this.logger.info(message)
      })

      socket.on(EVENT.DISCONNECTING, () => {
        this.logger.info('socketRooms', [...socket.rooms])
      })

      /**
       * @alias
       * WebSockets Authentication on the server.
       */
      socket.on(EVENT.USER_ASSERT, async user => {
        try {
          const email = await this.users.isAvailable({ email: user.email })

          if (email) {
            await this.users.updateLastLogin(user.id)

            socket.join(user.email)

            /**
             * @description
             * Getting values from meetings.
             */
            const rooms = await this.meetings.getActiveMeetings({
              userId: user.id
            })

            this.logger.info(
              'rooms',
              rooms.length > 0 ? rooms : { inactive: true }
            )

            if (rooms) {
              rooms.forEach(room => {
                socket.join(this.getSessionName(room))
                this.logger.info('Join into', { room: this.getSessionName(room) })

                this.stream.to(ROOMS.CLASSROOM).emit(EVENT.USER_JOIN_ROOM, {
                  connected: true,
                  rooms: rooms.map(this.getSessionName)
                })

                this.logger.info('User connection to room notifications')
              })

              this.logger.info(
                `${user.email} with socket.id ${socket.id} has joining tom ${ROOMS.CLASSROOM}`
              )

              /**
               * @description
               * Sending event of joining to the user.
               */
            }
          }
        } catch (err) {
          this.logger.error(err.name)
          this.logger.error(err.stack)
        }
      })

      socket.emit(EVENT.USER_ASSERT, { ping: true })

      this.logger.info('User Recognition Completed', socket.id)
    })
  }

  @Bind
  emitToRoom(room, event, ...args) {
    this.stream.to(room).emit(event, ...args)
  }
}

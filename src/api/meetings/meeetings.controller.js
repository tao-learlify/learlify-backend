import { Bind } from 'decorators'
import { MeetingsService } from 'api/meetings/meetings.service'
import { ClassesService } from 'api/classes/classes.service'
import { UsersService } from 'api/users/users.service'
import {
  UnauthorizedException,
  NotFoundException,
  ForbiddenException
} from 'exceptions'
import { Logger } from 'api/logger'
import { AuthenticationService } from 'api/authentication/authentication.service'

export class MeetingsController {
  constructor() {
    this.classesService = new ClassesService()
    this.meetingsService = new MeetingsService()
    this.usersService = new UsersService()
    this.authService = new AuthenticationService()
    this.logger = Logger.Service
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   * @param {import ('express').NextFunction} next
   */
  @Bind
  async token(req, res) {
    const user = req.user

    const room = req.query.room

    const classRoom = await this.classesService.getOne({
      name: room
    })

    if (classRoom) {
      this.logger.info('classRoom', { classRoom })

      if (classRoom.schedule.streaming) {
        /**
         * @description
         * If user in the classRoom we can grant a token.
         */
        const userInRoom = classRoom.meetings.find(
          meeting => meeting.user.id === user.id
        )

        /**
         * @description
         * If the teacher is in room we can grant a token.
         */
        const teacherInRoom = classRoom.schedule.teacher.email === user.email

        if (userInRoom || teacherInRoom) {
          const response = await this.meetingsService.joinMeeting(
            user.email,
            room
          )

          return res.status(200).json({
            message: 'Token has been consumed',
            response,
            statusCode: 200
          })
        }

        throw new UnauthorizedException(
          res.__('errors.The user doesnt belong to the classroom')
        )
      }

      throw new ForbiddenException(res.__('errors.The class-meeting is no longer available'))
    }

    throw new NotFoundException(res.__('errors.The meeting doesnt exist'))
  }


  /**
   * 
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  @Bind
  async twilioTest (req, res) {
    const user = req.user
  
    const response = await this.meetingsService.joinMeeting(
      user.email,
      'client'
    )

    return res.status(200).json({
      response,
      statusCode: 200
    })
  }


  /**
   * 
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  @Bind
  async identity (req, res) {
    const user = await this.usersService.getOne({
      email: req.query.email
    })

    const classRoom = await this.classesService.getOne({
      name: req.query.room
    })

    if (classRoom.schedule.streaming) {
      return res.status(200).json({
        response: this.authService.encrypt({
          ...user
        }),
        statusCode: 200
      })
    }

    throw new ForbiddenException(res.__('errors.Classroom is not streaming'))
  }
}

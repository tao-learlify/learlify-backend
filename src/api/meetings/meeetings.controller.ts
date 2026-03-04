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
import type { Request, Response } from 'express'

export class MeetingsController {
  private classesService: ClassesService
  private meetingsService: MeetingsService
  private usersService: UsersService
  private authService: AuthenticationService
  private logger: typeof Logger.Service

  constructor() {
    this.classesService = new ClassesService()
    this.meetingsService = new MeetingsService()
    this.usersService = new UsersService()
    this.authService = new AuthenticationService()
    this.logger = Logger.Service
  }

  @Bind
  async token(req: Request, res: Response): Promise<Response> {
    const user = req.user!

    const room = req.query.room

    const classRoom = await this.classesService.getOne({
      name: room
    } as unknown as Parameters<typeof this.classesService.getOne>[0])

    if (classRoom) {
      this.logger.info('classRoom', { classRoom })

      if ((classRoom as unknown as Record<string, unknown>).schedule && ((classRoom as unknown as Record<string, Record<string, unknown>>).schedule).streaming) {
        const userInRoom = ((classRoom as unknown as Record<string, Record<string, unknown>[]>).meetings || []).find(
          (meeting: Record<string, unknown>) => (meeting.user as Record<string, unknown>)?.id === user.id
        )

        const teacherInRoom = ((classRoom as unknown as Record<string, Record<string, Record<string, unknown>>>).schedule).teacher?.email === user.email

        if (userInRoom || teacherInRoom) {
          const response = await this.meetingsService.joinMeeting(
            user.email,
            room as string
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

  @Bind
  async twilioTest(req: Request, res: Response): Promise<Response> {
    const user = req.user!

    const response = await this.meetingsService.joinMeeting(
      user.email,
      'client'
    )

    return res.status(200).json({
      response,
      statusCode: 200
    })
  }

  @Bind
  async identity(req: Request, res: Response): Promise<Response> {
    const user = await this.usersService.getOne({
      email: req.query.email
    } as unknown as Parameters<typeof this.usersService.getOne>[0])

    const classRoom = await this.classesService.getOne({
      name: req.query.room
    } as unknown as Parameters<typeof this.classesService.getOne>[0])

    if ((classRoom as unknown as Record<string, Record<string, unknown>>).schedule?.streaming) {
      return res.status(200).json({
        response: this.authService.encrypt({
          ...user as unknown as Record<string, unknown>
        }),
        statusCode: 200
      })
    }

    throw new ForbiddenException(res.__('errors.Classroom is not streaming'))
  }
}

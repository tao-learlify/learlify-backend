export interface ScheduleTaskMeetingUserDTO {
  email: string
}

export interface ScheduleTaskMeetingDTO {
  timezone: string
  user: ScheduleTaskMeetingUserDTO
}

export interface ScheduleTaskClassesDTO {
  name: string
  expired: boolean
  meetings: ScheduleTaskMeetingDTO[]
}

export interface ScheduleTaskTeacherDTO {
  email: string
  firstName: string
}

export interface ScheduleTaskDTO {
  id: number
  startDate: string
  endDate: string
  teacher: ScheduleTaskTeacherDTO
  classes?: ScheduleTaskClassesDTO
}

export interface ScheduleNotifiedFilterDTO {
  date: {
    startDate: string
    endDate: string
  }
  taken: boolean
  notified: boolean
  [key: string]: unknown
}

export interface ScheduleExpireClassRoomFilterDTO {
  date: {
    expire: string
  }
  streaming: boolean
  [key: string]: unknown
}

export interface ScheduleOpenClassRoomFilterDTO {
  date: {
    now: string
    notExpired: boolean
  }
  notified: boolean
  taken: boolean
  [key: string]: unknown
}

export interface ScheduleDeleteNotTakenFilterDTO {
  date: {
    expire: string
  }
  taken: boolean
  [key: string]: unknown
}

export interface ScheduleDeleteByPayloadDTO {
  taken: boolean
  expire: string
}

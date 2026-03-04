export interface MeetingSource {
  id?: number
  classId?: number
  userId?: number
  closed?: boolean
  timezone?: string
}

export interface MeetingUpdateOptions {
  id?: number
  classId?: number
  userId?: number
}

export interface JoinMeetingResult {
  identity?: string
  token?: string
}

/**
 * @description
 * This is the main event from the library socket.io, should be IN LOWERCASE.
 * @memberof SocketIO
 */
export const CONNECTION = 'connection'
export const DISCONNECT = 'disconnect'
export const DISCONNECTING = 'disconnecting'
export const RECONNECTION = 'reconnection'
/**
 * @description
 * This events open a notification for user that the class room is open.
 * @memberof ScheduleTask
 */
export const OPEN_CLASS_ROOM = 'OPEN_CLASS_ROOM'

/**
 * @description
 * This event open a notification for the user that the class is going to be expired.
 * @memberof ScheduleTask
 */
export const EXPIRE_CLASS_ROOM = 'EXPIRE_CLASS_ROOM'

/**
 * @description
 * User recognition validation.
 * @memberof MainSocket
 */
export const USER_ASSERT = 'USER_ASSERT'

/**
 * @description
 * Emits that the user has joining to a room.
 * @memberof MainSocket
 */
export const USER_JOIN_ROOM = 'USER_JOIN_ROOM'

/**
 * @description
 * Gets the actual room to emit.
 * @memberof MainSocket
 */
export const JOIN_CHAT_ROOM = 'JOIN_CHAT_ROOM'

/**
 * @description
 * Sends a message through broadcasting.
 * @memberof MainSocket
 */
export const CHAT_MESSAGE = 'CHAT_MESSAGE'

/**
 * @description
 * Sends a message through broadcasting when user press keys.
 * @memberof MainSocket
 */
export const TYPING_MESSAGE = 'TYPING_MESSAGE'


/**
 * @description
 * Tracks a file attached via the client.
 * @memberof SocketIOStream
 */
export const FILE_UPLOAD_STREAM = 'FILE_UPLOAD_STREAM'


/** 
 * @description
 * Sends the file to the client.
 * @memberof SocketIOStream 
 */
export const FILE_ATTACH_STREAM = 'FILE_ATTACH_STREAM'


/**
 * @description
 * 
 * @memberof MainSocket
 */
export const MEETING_STATUS = 'MEETING_STATUS'

/** 
 * @description
 * A notification has been createad.
 * @memberof MainSocket
 */
export const NOTIFICATION = 'NOTIFICATION'
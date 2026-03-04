import type { Server } from 'socket.io'
import { stream } from '../index'

export class Socket {
  private socket: Server

  constructor() {
    this.socket = stream
  }

  public main(): { args: null } | void {
    return {
      args: null
    }
  }
}

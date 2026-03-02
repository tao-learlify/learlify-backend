import { stream } from ''

class Socket {
  constructor () {
    /**
     * @type {import ('socket.io').Server}
     */
    this.socket = stream
  }

  main () {
    return {
      args: null
    }
  }
} 

export { Socket }
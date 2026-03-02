export class NotFoundException extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.message = message || 'Not Found Exception'
    this.statusCode = 404
  }
}

export class BadRequestException extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.message = message || 'Bad Request Exception'
    this.statusCode = 400
  }
}

export class InternalServerErrorException extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.message = message || 'Internal Server Error'
    this.statusCode = 500
  }
}

export class UnauthorizedException extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.message = message || 'Unauthorized'
    this.statusCode = 401
  }
}

export class MisdirectedRequestException extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.message =
      message ||
      'The request was directed at a server that is not able to produce a response.'
  }
}

export class ConflictException extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.message =
      message ||
      'Conflict Request Exception, Maybe the resource is already created'
    this.statusCode = 409
  }
}

export class ForbiddenException extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message)
    this.message =
      message ||
      'Forbidden request, The server understood the request but refuses to authorize it.'
    this.statusCode = 403
    this.response = {
      requiredClientExpiration: true
    }
  }
}

export class TransactionError extends Error {
  constructor(message) {
    super(message)
    this.message = message || 'Transaction Error'
    this.statusCode = 500
  }
}

export class PaymentException extends Error {
  constructor({ response } = { response: null }) {
    super(({ response }))
    this.message = 'Payment required to access to request'
    this.response = response || undefined
    this.statusCode = 402
  }
}

export class GoneException extends Error {
  constructor(message) {
    super(message)
    this.message = message || 'The resouce is no longer available.'
    this.statusCode = 410
  }
}

/**
 * Error thrown when an error related to the database occures
 * @class IntegrityError
 * @extends {Error}
 */
export class IntegrityError extends Error {
  constructor(msg) {
    super(msg)
    this.message = msg || 'Error related to the database occurred.'
    this.status = 500
    this.name = 'IntegrityError'
  }
}

/**
 * Error thrown when there's an authorization error
 * @class UnauthorizedError
 * @extends {Error}
 */
export class UnauthorizedError extends Error {
  constructor(msg) {
    super(msg)
    this.message = msg || 'Unauthorized.'
    this.status = 401
    this.name = 'UnauthorizedError'
  }
}

/**
 * Error thrown when there's a permissions error
 * @class PermissionsError
 * @extends {Error}
 */
export class PermissionsError extends Error {
  constructor(msg) {
    super(msg)
    this.message = msg || "Forbidden. You don't have the necessary permissions"
    this.status = 403
    this.name = 'PermissionsError'
  }
}

/**
 * Error thrown when the resource doesn't exist
 * @class NotFound
 * @extends {Error}
 */
export class NotFound extends Error {
  constructor(id, msg) {
    super(id, msg)
    this.message =
      msg ||
      `The Resource with ID [${id}] was not found or doesn't exist. Make sure you provided the correct ID.`
    this.status = 404
    this.name = 'NotFound'
  }
}

/**
 * Class to define a page that doesn't exist
 * @class PageNotFound
 * @extends {Error}
 */
export class PageNotFound extends Error {
  constructor(msg) {
    super(msg)
    this.message = msg || "You provided a page number that doesn't exist."
    this.status = 400
    this.name = 'PageNotFound'
  }
}

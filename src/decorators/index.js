import cron from 'node-cron'
import express from 'express'
import { Logger } from 'api/logger'
import { Middleware } from 'middlewares'
import { ConfigService } from 'api/config/config.service'
import { lockAndRun } from 'common/cronLock'

/**
 * @param {Function} _target
 * @param {string} _property
 * @param {PropertyDescriptor} descriptor
 */
function Readonly(_target, _property, descriptor) {
  descriptor.writable = false
  return descriptor
}

/**
 * @param {{}} Tasks
 */
function CronSchedule(Tasks) {
  return class Schedule extends Tasks {
    constructor() {
      super()

      const lockTtlMs = parseInt(process.env.REDIS_LOCK_TTL_MS || '30000', 10)

      this.trigger = {
        schedule(expression, callback, options) {
          const key = `${Tasks.name}:${expression}`
          return cron.schedule(
            expression,
            () => lockAndRun(key, lockTtlMs, callback),
            options
          )
        }
      }
    }
  }
}

/**
 * @param {{ alias: string, route: string }}
 * @returns {() => ({}) => Function}
 */
function Router({ alias, route }) {
  return function (Controller) {
    return class Handler extends Controller {
      constructor() {
        super()
        this[alias] = express.Router()
        this.handler = route
      }

      get consumer() {
        return {
          route: this.handler,
          handlers: this[alias]
        }
      }
    }
  }
}

/**
 * @param {Function} _target
 * @param {string} property
 * @param {PropertyDescriptor} descriptor
 * @returns {PropertyDescriptor}
 */
function Bind(_target, property, descriptor) {
  const func = descriptor.value

  return {
    configurable: true,

    get() {
      const boundFunc = func.bind(this)

      Reflect.defineProperty(this, property, {
        value: boundFunc,
        configurable: true,
        writable: true
      })

      return function () {
        return boundFunc.apply(this, arguments)
      }
    }
  }
}

/**
 * @param {Function} target
 */
function Controller(target) {
  /**
   * @param {string} propertyName
   */
  function getMethodDescriptor(propertyName) {
    if (Object.prototype.hasOwnProperty.call(target.prototype, propertyName))
      return Object.getOwnPropertyDescriptor(target.prototype, propertyName)

    return {
      configurable: true,
      enumerable: true,
      writable: true,
      value: Middleware.secure(target.prototype[propertyName])
    }
  }

  for (const propertyName in target.prototype) {
    const currentProperty = target.prototype[propertyName]

    const isMethod = currentProperty instanceof Function

    if (isMethod) {
      const descriptor = getMethodDescriptor(propertyName)

      const originalMethod = descriptor.value

      /**
       * @param  {[]} args
       */
      descriptor.value = function (...args) {
        const context = originalMethod.appy(this, args)

        return Middleware.secure(context)
      }

      Object.defineProperty(
        Middleware.secure(target.prototype),
        propertyName,
        descriptor
      )
    }

    continue
  }
}

/**
 * @param {Function} ClassRef
 */
function Injectable(ClassRef) {
  return class InjectableRef extends ClassRef {
    constructor() {
      super()
      this.logger = Logger.Service
      this.config = new ConfigService()
    }

    get provider() {
      return this.config.provider
    }
  }
}

export { Controller, Injectable, Bind, Router, CronSchedule, Readonly }

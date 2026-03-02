import { Logger } from 'api/logger'
import validator from 'validator'

/**
 * 
 * @param {import ('express').Request} req 
 * @param {import ('express').Response} res 
 * @param {import ('express').NextFunction} next 
 */
export const updateProgressValidationJSON = (req, res, next) => {
  if (req.body.files) {
    try {
      Logger.Service.info('progress', req.body.files)

      const context = JSON.parse(req.body.files)

      const validations = [
        validator.isNumeric(context.id.toString()),
        validator.isNumeric(context.lastIndex.toString()),
        validator.isNumeric(context.score.toString()),
        validator.isUUID(context.uuid),
      ]
      
      /**
       * @description
       * If context feedback is valid
       */
      if (context.feedback) {
        validations.push(typeof context.feedback === 'object')
      }
      
      if (validations.every(valid => valid)) {
        Object.assign(req.body, context)

        return next()
      } else {
        throw new Error()
      }
    } catch (err) {
      Logger.Service.error('error', err)

      return res.status(400).json({
        message: err.message,
        statusCode: 400
      })
    }
  }

  return next()
}


import multer, { diskStorage } from 'multer'
import logger from '../../utils/logger'
import type { Request } from 'express'
import type { FileFilterCallback } from 'multer'

function sanitizeFile(file: Express.Multer.File, callback: FileFilterCallback): void {
  const audioMimeType = 'audio/'
  const isAllowedMimeType = file.mimetype.startsWith(audioMimeType)
  if (isAllowedMimeType) {
    return callback(null, true)
  }
  logger.error('Mimetype not allowed.')
  callback(new Error('Mimetype is not allowed.'))
}

const storage = diskStorage({
  destination: function (_req: Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) {
    return callback(null, __dirname)
  },
  filename: function (_req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) {
    callback(null, `${Date.now()}-${file.originalname}`)
  }
})

export const upload = multer({
  storage,
  limits: {
    fileSize: 9000000
  },
  fileFilter: function (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) {
    logger.info('fileFilter callback.')
    sanitizeFile(file, callback)
  }
}).single('upload')

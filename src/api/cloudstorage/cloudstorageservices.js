
import multer, { diskStorage } from 'multer'
import logger from '../../utils/logger'
import CloudStorage from './cloudstorage.model'
CloudStorage

/**
 * @description
 * Allows to validate the mime type of the file.
 * If the file is not allowed returns an error.
 * @param {Multer.File} file 
 * @param {Function} callback 
 */
function sanitizeFile(file, callback) {
  const audioMimeType = 'audio/'
  const isAllowedMimeType = file.mimetype.startsWith(audioMimeType)
  if (isAllowedMimeType) {
    return callback(null, true)
  }
  logger.error('Mimetype not allowed.')
  callback('Mimetype is not allowed.')
}

/**
 * @typedef {Multer.diskStorage}
 */
const storage = diskStorage({
  destination: function(_req, _file, callback) {
    return callback(null, __dirname)
  },
  filename: function(_req, file, callback) {
    callback(null, `${Date.now()}-${file.originalname}`)
  }
})

/**
 * Allows to configurate our file filter, storage, and maximum fileSize.
 */
export const upload = multer({
  storage,
  limits: {
    fileSize: 9000000
  },
  fileFilter: function(_req, file, callback) {
    logger.info('fileFilter callback.')
    sanitizeFile(file, callback)
  }
}).single('upload')
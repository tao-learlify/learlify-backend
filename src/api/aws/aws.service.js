import AWS from 'aws-sdk'
import Multer from 'multer'
import MulterS3Plugin from 'multer-s3'
import { ConfigService } from 'api/config/config.service'
import { generateDateFileName, sanitizeFile } from 'functions'

export class AmazonWebServices {
  constructor() {
    this.uploadKey = 'upload'
    this.configService = new ConfigService()
    this.fileInterceptor = this.fileInterceptor.bind(this)
  }

  get s3() {
    const { provider } = this.configService

    return new AWS.S3({
      accessKeyId: provider.AWS_ACCESS_KEY,
      secretAccessKey: provider.AWS_SECRET_KEY
    })
  }

  /**
   * @typedef {Object} FileInterceptorOptions
   * @property {string} bucket
   *
   * @param {FileInterceptorOptions} fileInterceptorOptions
   */
  fileInterceptor(fileInterceptorOptions) {
    const { FILESIZE } = this.configService.provider.MULTIPART_FORMDATA
    const instance = Multer({
      limits: { fileSize: FILESIZE },
      fileFilter(req, file, callback) {
        sanitizeFile(file, callback)
      },
      storage: MulterS3Plugin({
        s3: this.s3,
        bucket: fileInterceptorOptions.bucket,
        metadata(req, file, callback) {
          callback(null, { fieldName: file.fieldname })
        },
        key(req, file, callback) {
          callback(null, generateDateFileName(file.originalname))
        }
      })
    })

    return instance.single(this.uploadKey)
  }

  /**
   *
   * @param {import ('aws-sdk').S3.GetObjectRequest} request
   */
  async getJSONFile(request, parse) {
    return new Promise((resolve, reject) => {
      this.s3.getObject(request, (err, data) => {
        if (err) {
          return reject(err)
        }
        const file = data.Body.toString()

        return resolve(parse ? JSON.parse(file) : file)
      })
    })
  }
}

import Multer from 'multer'
import MulterS3 from 'multer-s3'
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { ConfigService } from 'api/config/config.service'
import { generateDateFileName, sanitizeFile } from 'functions'
import { s3Client } from './s3.client'

const streamToBuffer = async (stream) => {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export class AmazonWebServices {
  constructor() {
    this.uploadKey = 'upload'
    this.configService = new ConfigService()
    this.fileInterceptor = this.fileInterceptor.bind(this)
  }

  /**
   * @typedef {Object} FileInterceptorOptions
   * @property {string} bucket
   *
   * @param {FileInterceptorOptions} fileInterceptorOptions
   */
  fileInterceptor({ bucket }) {
    const { FILESIZE } = this.configService.provider.MULTIPART_FORMDATA
    const instance = Multer({
      limits: { fileSize: FILESIZE },
      fileFilter(req, file, callback) {
        sanitizeFile(file, callback)
      },
      storage: MulterS3({
        s3: s3Client,
        bucket,
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

  async getObjectBody(params) {
    const response = await s3Client.send(new GetObjectCommand(params))
    return streamToBuffer(response.Body)
  }

  async getJSONFile(params, parse) {
    const buffer = await this.getObjectBody(params)
    const file = buffer.toString()
    return parse ? JSON.parse(file) : file
  }

  async putObject(params) {
    return s3Client.send(new PutObjectCommand(params))
  }

  async deleteObject(params) {
    return s3Client.send(new DeleteObjectCommand(params))
  }

  async deleteObjects(params) {
    return s3Client.send(new DeleteObjectsCommand(params))
  }

  async upload(params) {
    return new Upload({ client: s3Client, params }).done()
  }
}

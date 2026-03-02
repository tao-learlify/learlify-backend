import { Logger } from 'api/logger'
import { Bind } from 'decorators'
import { AmazonWebServices } from './aws.service'
import { CloudStorageService } from 'api/cloudstorage/cloudstorage.service'
import { PackagesService } from 'api/packages/packages.service'
import { InternalServerErrorException, PaymentException } from 'exceptions'

class AWSController {
  constructor({ bucket }) {
    this.aws = new AmazonWebServices()
    this.cloudStorageService = new CloudStorageService()
    this.packagesService = new PackagesService()
    this.logger = Logger.Service
    this.bucket = bucket
  }

  /**
   * @param {import ('express').Request} req
   * @param {import ('express').Response} res
   */
  @Bind
  async getFile(req, res) {
    const { filename, bucket, key } = req.query

    this.aws.s3.getObject(
      {
        Bucket: bucket || 'aptisgo',
        Key: key.concat('/', filename)
      },
      (err, data) => {
        if (err) {
          throw new InternalServerErrorException(err.message)
        }
        return res.status(200).json({
          message: 'File get succesfully',
          response: data.Body.toString('base64'),
          statusCode: 200
        })
      }
    )
  }

  /**
   * @param {Request} req
   * @param {Response} res
   */
  @Bind
  async uploadSpeaking(req, res) {
    const user = req.user

    const file = req.file

    const subscription = await this.packagesService.getActiveSubscription({
      competence: 'speakings',
      userId: user.id
    })

    const isNotSubscribed = !subscription

    if (isNotSubscribed && req.query.feedback) {
      return this.aws.s3.deleteObject(
        {
          Bucket: this.bucket,
          Key: file.Key
        },
        err => {
          if (err) {
            this.logger.error('deleteObjectException', err)

            throw new InternalServerErrorException()
          }

          this.logger.info(
            'Object Speaking deleted due to payment requirement.'
          )

          throw new PaymentException()
        }
      )
    }

    const storage = await this.cloudStorageService.create({
      bucket: file.bucket,
      Etag: file.etag,
      key: file.key,
      location: file.location,
      userId: user.id
    })

    return res.status(201).json({
      messasge: 'Speaking uploaded succesfuly',
      storage,
      statusCode: 201
    })
  }
}


export { AWSController }
import { AmazonWebServices as AWS } from 'api/aws/aws.service'

class ClientLogsController {
  constructor() {
    this.AWS = new AWS()
  }
  /**
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  async log(req, res) {
    const user = req.user

    const folder = await this.AWS.s3.putObject({
      Key: `logs/${user.email}/`,
      Bucket: process.env.AWS_S3_BUCKET,
    }).promise()

    return res.json(folder)
  }
}


export { ClientLogsController }
import { AmazonWebServices } from 'api/aws/aws.service'

class ClientLogsController {
  constructor() {
    this.aws = new AmazonWebServices()
  }
  /**
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  async log(req, res) {
    const user = req.user

    const folder = await this.aws.putObject({
      Key: `logs/${user.email}/`,
      Bucket: process.env.AWS_BUCKET
    })

    return res.json(folder)
  }
}


export { ClientLogsController }
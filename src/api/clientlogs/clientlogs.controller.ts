import { AmazonWebServices } from 'api/aws/aws.service'
import type { Request, Response } from 'express'

class ClientLogsController {
  private aws: AmazonWebServices

  constructor() {
    this.aws = new AmazonWebServices()
  }

  async log(req: Request, res: Response): Promise<Response> {
    const user = req.user!

    const folder = await this.aws.putObject({
      Key: `logs/${user.email}/`,
      Bucket: process.env.AWS_BUCKET
    })

    return res.json(folder)
  }
}

export { ClientLogsController }

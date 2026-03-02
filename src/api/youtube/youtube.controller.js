import { Bind } from 'decorators'
import { YoutubeService } from './youtube.service'

class YoutubeController {
  constructor () {
    this.youtubeService = new YoutubeService()
  }
  /**
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  @Bind
  async getAll (req, res) {
    return res.json({
      statusCode: 404
    })
  }
}

export { YoutubeController }

import { Bind } from 'decorators'
import { LanguageService } from './languages.services'

class LanguageController {
  constructor () {
    this.languagesService = new LanguageService()
  }
  
  /**
   * 
   * @param {import ('express').Request} req 
   * @param {import ('express').Response} res 
   */
  @Bind
  async getAll (req, res) {
    const languages = await this.languagesService.getAll()

    return res.status(200).json({
      message: 'Languages obtained succesfully',
      response: languages,
      statusCode: 200
    })
  }
}

export { LanguageController }
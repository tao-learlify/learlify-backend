import Language from './languages.model'


class LanguageService {
  getAll () {
    return Language.query()
  }
  /**
   * @param {{}} options
   * @returns {Promise<Language>} 
   */
  getOne (options) {
    return Language.query().findOne(options)
  }
}

export { LanguageService }
import Models from './models.model'

class ModelsService {
  getAll() {
    return Models.query()
  }
  /**
   * @param {{ name: string }} data
   */
  getOne(data) {
    return Models.query().findOne(data)
  }
}

export { ModelsService }

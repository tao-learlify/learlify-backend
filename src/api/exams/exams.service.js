import Exam from './exams.model'
import { Bind, Injectable } from 'decorators'
import { AmazonWebServices } from 'api/aws/aws.service'
import { parseContent } from 'functions'

/**
 * @typedef {Object} Source
 * @property {number} id
 */

@Injectable
class ExamsService {
  #relation

  constructor() {
    this.s3 = new AmazonWebServices().s3

    this.#relation = {
      getOne: {
        graph: 'progress(owner)',
        foreignKey: 'progress.userId'
      }
    }
    this.clientAttributes = [
      'id',
      'name',
      'updatedAt',
      'createdAt',
      'dir',
      'requiresPayment',
      'imageUrl',
      'alternImageUrl'
    ]
  }

  /**
   * @param {{ name: string, id: number }} data
   * @param {string} category
   */
  @Bind
  async findCloudS3Resource(data, category) {
    const exam = await Exam.query()
      .findOne(data)
      .select(['id', 'dir', 'name', 'version'])
      .withGraphFetched({
        model: {
          $modify: ['clientAttributes']
        }
      })

    const file = await this.s3
      .getObject({
        Bucket: process.env.AWS_BUCKET,
        Key: `${Exam.tableName}/${exam.version}/${exam.dir}`
      })
      .promise()

    if (category && file?.Body) {
      const { exercises } = parseContent({
        data: file.Body.toString(),
        key: decodeURIComponent(category)
      })

      return {
        exam,
        exercises
      }
    }

    try {
      return JSON.parse(file?.Body.toString())
    } catch (err) {
      return []
    }
  }

  /**
   * @param {{ modelId?: number | string }}
   */
  @Bind
  async getAll({ getIds, modelId }) {
    const { clientAttributes } = this

    if (getIds) {
      const exams = await Exam.query()
        .select(clientAttributes)
        .where({ examModelId: modelId })
        .withGraphFetched({ model: true })
        .select(['id'])

      return exams.map(exam => exam.id)
    }
    return Exam.query()
      .select(clientAttributes)
      .where({ examModelId: modelId })
      .withGraphFetched({ model: true })
  }

  /**
   * @param {Source} exam
   */
  @Bind
  getOne({ withoutGraph, id, ...exam }) {
    const { getOne } = this.#relation

    if (withoutGraph) {
      return Exam.query().findOne({
        id: id,
        ...exam
      })
    }

    if (id) {
      /**
       * @description
       * Getting the exam
       */
      return Exam.query()
        .findById(id)
        .select(this.clientAttributes)
        .withGraphFetched(getOne.graph)
        .withGraphFetched({ model: true })
        .modifiers({
          owner(builder) {
            builder.select('*').where({ userId: exam.user })
          }
        })
    }
  }
}

export { ExamsService }

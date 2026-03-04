import Exam from './exams.model'
import { Bind, Injectable } from 'decorators'
import { AmazonWebServices } from 'api/aws/aws.service'
import { parseContent } from 'functions'

@Injectable
class ExamsService {
  #relation: {
    getOne: {
      graph: string
      foreignKey: string
    }
  }

  private aws: AmazonWebServices
  private clientAttributes: string[]

  constructor() {
    this.aws = new AmazonWebServices()

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

  @Bind
  async findCloudS3Resource(data: { name?: string; id?: number }, category?: string) {
    const exam = await Exam.query()
      .findOne(data)
      .select(['id', 'dir', 'name', 'version'])
      .withGraphFetched({
        model: {
          $modify: ['clientAttributes']
        }
      })

    const body = await this.aws.getObjectBody({
      Bucket: process.env.AWS_BUCKET as string,
      Key: `${Exam.tableName}/${(exam as unknown as Record<string, unknown>).version}/${(exam as unknown as Record<string, unknown>).dir}`
    })

    if (category && body) {
      const { exercises } = parseContent({
        data: body.toString(),
        key: decodeURIComponent(category)
      } as unknown as Parameters<typeof parseContent>[0])

      return {
        exam,
        exercises
      }
    }

    try {
      return JSON.parse(body.toString())
    } catch (err) {
      return []
    }
  }

  @Bind
  async getAll({ getIds, modelId }: { getIds?: boolean; modelId?: number | string }) {
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

  @Bind
  getOne({ withoutGraph, id, ...exam }: { withoutGraph?: boolean; id?: number; user?: number; [key: string]: unknown }) {
    const { getOne } = this.#relation

    if (withoutGraph) {
      return Exam.query().findOne({
        id: id,
        ...exam
      })
    }

    if (id) {
      return Exam.query()
        .findById(id)
        .select(this.clientAttributes)
        .withGraphFetched(getOne.graph)
        .withGraphFetched({ model: true })
        .modifiers({
          owner(builder) {
            builder.select('*').where({ userId: (exam as Record<string, unknown>).user })
          }
        })
    }
  }
}

export { ExamsService }

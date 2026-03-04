import knexFactory, { type Knex } from 'knex'
import { Model } from 'objection'
import knexFileConfig from './knexfile'

const knexConfig = knexFactory(knexFileConfig as unknown as Knex.Config)
Model.knex(knexConfig)

export default knexConfig

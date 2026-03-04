import CloudStorage from './cloudstorage.model'
import type { CloudStorageInput } from './cloudstorage.types'

export const createStorage = async (storage: CloudStorageInput): Promise<CloudStorage> =>
  CloudStorage.query().insertAndFetch(storage)

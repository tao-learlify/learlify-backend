import CloudStorage from './cloudstorage.model'

/**
 * @description
 * Saves information about all amazon S3 Bucket in our database.
 * @param {{}} storage
 * @returns {Promise<CloudStorage>} 
 */
export const createStorage = async (storage) => 
  CloudStorage.query().insertAndFetch(storage)


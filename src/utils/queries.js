/**
 * Check an array of options, that will passed as argument in a controller.
 * If the option is defined, will return his query option.
 * @param {[{ option: any, query: Promise }]} queries
 * @returns {Promise<any>} 
 */
export const getQuery = (queries, defaultValue) => {
  const data = queries.find(({ option }) => option)
  
  return data ? data.query : defaultValue
}

/**
 * 
 * @param {string []} queries 
 */
export const validateQueryParameters = (queries) => {
  return queries.every(query => query)
}
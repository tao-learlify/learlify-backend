// Estas dependencias solo se necesitan cuando knexfile.js es cargado
// directamente por el CLI de knex (migraciones). En producción (runtime de Node)
// dotenv ya fue inicializado por src/config/index.js y @babel/register no existe.
try {
  const dotenvPath =
    process.env.DOTENV_CONFIG_PATH ||
    require('path').resolve(process.cwd(), '.env')
  require('dotenv').config({ path: dotenvPath })
} catch (_) {
  /* intentionally ignored */
}
try {
  require('@babel/register')
} catch (_) {
  /* intentionally ignored */
}

const connection = {
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8',
  timezone: 'UTC',
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string()

      return value ? value === '1' : null
    }

    return next()
  }
}

/**
 * Database configuration.
 */
module.exports = {
  connection,
  client: process.env.DB_CLIENT,
  migrations: {
    tableName: 'migrations',
    directory: '../migrations'
  },
  seeds: {
    directory: '../seeds'
  }
}

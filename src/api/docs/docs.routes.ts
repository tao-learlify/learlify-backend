import express from 'express'
import swaggerUi from 'swagger-ui-express'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'

const router = express.Router()

const openApiPath = path.join(__dirname, '../../../..', 'docs', 'openapi.yaml')

let swaggerDocument: object

try {
  const fileContents = fs.readFileSync(openApiPath, 'utf8')
  swaggerDocument = yaml.load(fileContents) as object
} catch {
  swaggerDocument = { openapi: '3.0.3', info: { title: 'API', version: '1.0.0' }, paths: {} }
}

const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Learlify API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true
  }
}

router.use('/docs', swaggerUi.serve)
router.get('/docs', swaggerUi.setup(swaggerDocument, swaggerOptions))

router.get('/docs/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json(swaggerDocument)
})

export default router

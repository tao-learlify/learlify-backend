import request from 'supertest'
import { core } from 'core/config.core'

it('Get all plans', async () => {
  const response = await request(core.app)
    .get('/api/v1/plans')
    .set('Authorization', process.env.X_AUTH_TOKEN)

  expect(response.status).toBe(200)
})

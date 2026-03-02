jest.mock('api/aws/s3.client', () => ({
  s3Client: { send: jest.fn() }
}))

jest.mock('api/config/config.service', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    provider: {
      AWS_ACCESS_KEY: 'AKIATEST',
      AWS_SECRET_KEY: 'test-secret',
      AWS_REGION: 'us-east-1',
      MULTIPART_FORMDATA: { FILESIZE: 5000000 }
    }
  }))
}))

jest.mock('functions', () => ({
  generateDateFileName: jest.fn(name => `2026-03-02-${name}`),
  sanitizeFile: jest.fn((_f, cb) => cb(null, true))
}))

import { s3Client } from 'api/aws/s3.client'
import { AmazonWebServices } from 'api/aws/aws.service'

const makeAsyncIterator = (buffers) => ({
  [Symbol.asyncIterator]: async function* () {
    for (const buf of buffers) yield buf
  }
})

describe('AmazonWebServices — SDK v3', () => {
  let aws

  beforeEach(() => {
    aws = new AmazonWebServices()
    jest.clearAllMocks()
  })

  describe('getObjectBody()', () => {
    it('llama GetObjectCommand y retorna Buffer', async () => {
      const mockBody = makeAsyncIterator([Buffer.from('hello'), Buffer.from(' world')])
      s3Client.send.mockResolvedValueOnce({ Body: mockBody })

      const result = await aws.getObjectBody({ Bucket: 'test-bucket', Key: 'file.txt' })

      expect(s3Client.send).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString()).toBe('hello world')
    })
  })

  describe('getJSONFile()', () => {
    it('retorna string cuando parse=false', async () => {
      const body = makeAsyncIterator([Buffer.from('raw text')])
      s3Client.send.mockResolvedValueOnce({ Body: body })

      const result = await aws.getJSONFile({ Bucket: 'b', Key: 'k' }, false)

      expect(result).toBe('raw text')
    })

    it('parsea JSON cuando parse=true', async () => {
      const body = makeAsyncIterator([Buffer.from(JSON.stringify({ score: 42 }))])
      s3Client.send.mockResolvedValueOnce({ Body: body })

      const result = await aws.getJSONFile({ Bucket: 'b', Key: 'k.json' }, true)

      expect(result).toEqual({ score: 42 })
    })
  })

  describe('putObject()', () => {
    it('llama PutObjectCommand con los params correctos', async () => {
      s3Client.send.mockResolvedValueOnce({ ETag: '"abc123"' })

      const result = await aws.putObject({ Bucket: 'test', Key: 'logs/user@test.com/', Body: '' })

      expect(s3Client.send).toHaveBeenCalledTimes(1)
      expect(result.ETag).toBe('"abc123"')
    })
  })

  describe('deleteObject()', () => {
    it('llama DeleteObjectCommand con los params correctos', async () => {
      s3Client.send.mockResolvedValueOnce({})

      await aws.deleteObject({ Bucket: 'test', Key: 'speakings/file.mp3' })

      expect(s3Client.send).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteObjects()', () => {
    it('llama DeleteObjectsCommand con lista de objetos', async () => {
      s3Client.send.mockResolvedValueOnce({ Deleted: [{ Key: 'a.mp3' }, { Key: 'b.mp3' }] })

      const result = await aws.deleteObjects({
        Bucket: 'test',
        Delete: { Objects: [{ Key: 'a.mp3' }, { Key: 'b.mp3' }] }
      })

      expect(s3Client.send).toHaveBeenCalledTimes(1)
      expect(result.Deleted).toHaveLength(2)
    })
  })
})

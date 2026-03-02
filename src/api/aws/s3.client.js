import { S3Client } from '@aws-sdk/client-s3'
import { ConfigService } from 'api/config/config.service'

const buildS3Client = () => {
  const { provider } = new ConfigService()

  return new S3Client({
    region: provider.AWS_REGION,
    credentials: {
      accessKeyId: provider.AWS_ACCESS_KEY,
      secretAccessKey: provider.AWS_SECRET_KEY
    }
  })
}

export const s3Client = buildS3Client()

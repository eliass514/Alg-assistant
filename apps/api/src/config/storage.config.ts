import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  s3: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    endpoint?: string;
    forcePathStyle?: boolean;
  };
  presignedUrlExpiration: number;
}

export default registerAs<StorageConfig>('storage', () => {
  const presignedUrlExpiration = parseInt(process.env.S3_PRESIGNED_URL_EXPIRATION ?? '3600', 10);

  return {
    s3: {
      region: process.env.AWS_REGION ?? 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      bucketName: process.env.AWS_S3_BUCKET_NAME ?? '',
      endpoint: process.env.AWS_S3_ENDPOINT,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    },
    presignedUrlExpiration: isNaN(presignedUrlExpiration) ? 3600 : presignedUrlExpiration,
  };
});

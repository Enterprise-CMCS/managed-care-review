import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type ArtifactS3ClientConfig = {
  region: string
  endpoint?: string
  forcePathStyle?: boolean
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

export interface ArtifactS3Client {
  putJson(bucket: string, key: string, value: unknown): Promise<void>
  getJson<T>(bucket: string, key: string): Promise<T>
  putText(bucket: string, key: string, value: string): Promise<void>
  getBuffer(bucket: string, key: string): Promise<Buffer>
}

export function newArtifactS3Client(
  config: ArtifactS3ClientConfig
): ArtifactS3Client {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: config.credentials
  })

  return {
    async putJson(bucket: string, key: string, value: unknown): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          // Store artifacts as plain JSON so they stay easy to inspect in S3.
          Body: JSON.stringify(value),
          ContentType: 'application/json'
        })
      )
    },

    async getJson<T>(bucket: string, key: string): Promise<T> {
      const buffer = await getBufferOrThrow(client, bucket, key);
      const text = buffer.toString("utf-8");
      try {
        return JSON.parse(text) as T;
      } catch (error) {
        throw new Error(`Failed to parse JSON from s3://${bucket}/${key}`);
      }
    },

    async putText(bucket: string, key: string, value: string): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: value,
          ContentType: 'text/plain; charset=utf-8'
        })
      )
    },

    async getBuffer(bucket: string, key: string): Promise<Buffer> {
      return getBufferOrThrow(client, bucket, key)
    }
  }
}

async function getBufferOrThrow (
  client: S3Client,
  bucket: string,
  key: string
): Promise<Buffer> {
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    )

    if (!response.Body) {
      throw new Error(`S3 object body was empty for s3://${bucket}/${key}`)
    }

    // The SDK returns a stream-like body; convert it once here so callers can
    // work with a normal Buffer regardless of the original object type.
    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes)
  } catch (error) {
    if (error instanceof NoSuchKey) {
      throw new Error(`S3 object not found: s3://${bucket}/${key}`)
    }

    throw error
  }
}

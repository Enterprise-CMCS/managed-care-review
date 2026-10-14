export type { S3ClientT } from './s3Client'
export type { S3Error } from './s3Error'
export { isS3Error } from './s3Error'
export type { BucketShortName, S3BucketConfigType } from './s3Amplify'

export { newAmplifyS3Client } from './s3Amplify'
export { newApiS3Client } from './s3Api'
export { newLocalS3Client } from './s3Local'

// Keep browser credentials limited to reads and create-only uploads. Bucket
// policies enforce the precondition and deny destructive operations even when
// an imported identity-pool role still has its legacy s3:* policy.
export const BROWSER_S3_OBJECT_ACTIONS = [
    's3:GetObject',
    's3:PutObject',
    's3:AbortMultipartUpload',
    's3:ListMultipartUploadParts',
]

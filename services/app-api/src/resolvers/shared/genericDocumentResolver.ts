import type { Resolvers } from '../../gen/gqlServer'
import {
    newAmplifyS3Client,
    newLocalS3Client,
    parseBucketName,
    parseKey,
} from '../../s3'
import type { S3BucketConfigType } from '../../s3/s3Amplify'
import type { S3ClientT } from '../../s3'

export function genericDocumentResolver(): Resolvers['GenericDocument'] {
    return {
        downloadURL: async (parent) => {
            try {
                const s3URL = parent.s3URL ?? ''
                const key = parseKey(s3URL)
                const bucket = parseBucketName(s3URL)
                if (key instanceof Error || bucket instanceof Error) {
                    const err = new Error(
                        'S3 needs to be provided a valid key and bucket'
                    )
                    throw err
                }
                // S3 Region and LocalUrl are mutually exclusive.
                // One is used in AWS and one is used locally.
                const s3Region = process.env.REACT_APP_S3_REGION
                const s3LocalURL = process.env.REACT_APP_S3_LOCAL_URL
                const s3DocumentsBucket =
                    process.env.REACT_APP_S3_DOCUMENTS_BUCKET
                const s3QABucket = process.env.REACT_APP_S3_QA_BUCKET

                if (
                    s3DocumentsBucket === undefined ||
                    s3QABucket === undefined
                ) {
                    throw new Error(
                        'To configure s3, you  must set REACT_APP_S3_DOCUMENTS_BUCKET and REACT_APP_S3_QA_BUCKET'
                    )
                }

                if (s3Region !== undefined && s3LocalURL !== undefined) {
                    throw new Error(
                        'You cant set both REACT_APP_S3_REGION and REACT_APP_S3_LOCAL_URL. Pick one depending on what environment you are in'
                    )
                }

                let s3Client: S3ClientT
                const S3_BUCKETS_CONFIG: S3BucketConfigType = {
                    HEALTH_PLAN_DOCS: s3DocumentsBucket,
                    QUESTION_ANSWER_DOCS: s3QABucket,
                }

                if (process.env.REACT_APP_AUTH_MODE !== 'LOCAL') {
                    s3Client = newAmplifyS3Client(S3_BUCKETS_CONFIG)
                } else if (s3LocalURL) {
                    s3Client = newLocalS3Client(s3LocalURL, S3_BUCKETS_CONFIG)
                } else {
                    throw new Error(
                        'You must set either REACT_APP_S3_REGION or REACT_APP_S3_LOCAL_URL depending on what environment you are in'
                    )
                }

                const url = await s3Client.getURL(key, 'HEALTH_PLAN_DOCS')

                return url
            } catch (err) {
                console.error(err)
                throw err
            }
        },
    }
}

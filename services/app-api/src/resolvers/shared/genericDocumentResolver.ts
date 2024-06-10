import type { Resolvers } from '../../gen/gqlServer'
import Url from 'url-parse'
import {
    newAmplifyS3Client,
    newLocalS3Client,
} from '../../../../app-web/src/s3'
import type { S3BucketConfigType } from '../../../../app-web/src/s3/s3Amplify'
import type { S3ClientT } from '../../../../app-web/src/s3'

// tslint:disable-next-line
const isValidS3URLFormat = (url: {
    protocol: string
    slashes: boolean
    pathname: string
}): boolean => {
    return (
        url.protocol === 's3:' &&
        url.slashes === true &&
        url.pathname.split('/').length === 3
    )
}
const parseBucketName = (maybeS3URL: string): string | Error => {
    const url = new Url(maybeS3URL)
    if (!isValidS3URLFormat(url)) throw new Error('Not valid S3URL')
    return url.hostname
}

const parseKey = (maybeS3URL: string): string | Error => {
    const url = new Url(maybeS3URL)
    if (!isValidS3URLFormat(url)) return new Error('Not valid S3URL')
    return url.pathname.split('/')[1]
}

export function genericDocumentResolver(): Resolvers['GenericDocument'] {
    return {
        downloadURL: async (parent) => {
            try {
                const s3URL = parent.s3URL ?? ''
                const key = parseKey(s3URL)
                const bucket = parseBucketName(s3URL)
                if (key instanceof Error || bucket instanceof Error) {
                    // todo throw error
                    return 'err'
                }
                console.info(
                    `${bucket} ====================== BUCKET =============`
                )
                console.info(
                    `${s3URL} ====================== S3URL =============`
                )
                let s3Client: S3ClientT
                const s3LocalURL = 'http://localhost:4569'
                const s3DocumentsBucket = 'local-uploads'
                const s3QABucket = 'local-qa'
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
            } catch (e) {
                console.error(e)
                return 'test'
            }
        },
    }
}

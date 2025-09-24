import type { Resolvers } from '../../gen/gqlServer'
import { parseBucketName, parseKey, type S3ClientT } from '../../s3'
import type { QuestionAndResponseDocument } from '../../domain-models'

export function questionResponseDocumentResolver(
    s3Client: S3ClientT
): Resolvers['QuestionResponseDocument'] {
    return {
        downloadURL: async (parent: QuestionAndResponseDocument) => {
            const s3URL = parent.s3URL ?? ''
            const key = parseKey(s3URL)
            const bucket = parseBucketName(s3URL)
            if (key instanceof Error || bucket instanceof Error) {
                throw new Error(
                    'S3 needs to be provided a valid key and bucket'
                )
            }

            const url = await s3Client.getURL(key, 'QUESTION_ANSWER_DOCS')
            if (!url) {
                throw new Error('error getting download url from S3')
            }
            return url
        },
    }
}

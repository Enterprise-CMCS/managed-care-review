import type { Resolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { getS3Key } from '../../s3'
import type { QuestionAndResponseDocument } from '../../domain-models'

export function questionResponseDocumentResolver(
    s3Client: S3ClientT
): Resolvers['QuestionResponseDocument'] {
    return {
        downloadURL: async (parent: QuestionAndResponseDocument) => {
            const key = getS3Key(parent)

            if (key instanceof Error) {
                throw new Error(`Document missing valid s3Key: ${key.message}`)
            }

            const url = await s3Client.getURL(key, 'QUESTION_ANSWER_DOCS')
            if (!url) {
                throw new Error('error getting download url from S3')
            }
            return url
        },
    }
}

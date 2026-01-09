import { GraphQLError } from 'graphql'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { canWrite } from '../../authorization/oauthAuthorization'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import type { S3ClientT } from '../../s3'
import { createUserInputError } from '../errorUtils'
import { v4 as uuidv4 } from 'uuid'
import { Context } from '../../handlers/apollo_gql'

export function generateUploadURLResolver(
    store: Store,
    s3Client: S3ClientT
): MutationResolvers['generateUploadURL'] {
    return async (_parent, { input }, context: Context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('generateUploadURLResolver', {}, ctx)
        setResolverDetailsOnActiveSpan('generateUploadURL', user, span)

        // Check OAuth client write permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('generateUploadURL', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        const { fileName, contentType } = input
        const expiresIn = 300 //300 is 5 mins, default (900) is 15 mins

        if (!fileName) {
            //throw error
        }
        if (!contentType) {
            //throw error
        }

        const s3Key = `uploads/${uuidv4()}-${fileName}`
        // const s3Key = s3Client.getKey(fileName) //which is correct way to get the key?
        const bucketName = 'HEALTH_PLAN_DOCS' //we need the document bucket name!!

        const uploadURL = await s3Client.getUploadURL(
            s3Key,
            bucketName,
            contentType,
            expiresIn
        )

        if (s3Client instanceof Error) {
            logError('generateUploadURL', s3Client.message)
            setErrorAttributesOnActiveSpan(s3Client.message, span)
            throw new GraphQLError(s3Client.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'S3_ERROR',
                },
            })
        }

        logSuccess('generateUploadURL')
        setSuccessAttributesOnActiveSpan(span)

        return {
            uploadURL,
            s3Key,
            bucket: bucketName,
        }
    }
}

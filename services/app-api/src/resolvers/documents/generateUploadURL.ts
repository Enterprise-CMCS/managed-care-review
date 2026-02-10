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
import { v4 as uuidv4 } from 'uuid'
import type { Context } from '../../handlers/apollo_gql'
import type { BucketShortName } from '../../s3'
import { UPLOAD_FILE_TYPE_TO_MIME } from './uploadFileTypeMap'

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

        const { fileName, fileType } = input
        const expiresIn = 300 //300 is 5 mins, default (900) is 15 mins

        if (!fileName) {
            const fileNameErr = 'file name cannot be blank'
            logError('generateUploadURL', fileNameErr)
            setErrorAttributesOnActiveSpan(fileNameErr, span)
            throw new GraphQLError(fileNameErr, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'BAD_USER_INPUT',
                },
            })
        }

        // fileType is guaranteed to be a valid UploadFileType enum by GraphQL, no additional validations needed here
        const contentType =
            UPLOAD_FILE_TYPE_TO_MIME[
                fileType as keyof typeof UPLOAD_FILE_TYPE_TO_MIME
            ]

        const extension = fileName.split('.').pop()?.toLowerCase()

        if (extension !== fileType.toLowerCase()) {
            const extenErr = `File extension ".${extension}" does not match fileType "${fileType}"`
            logError('generateUploadURL', extenErr)
            setErrorAttributesOnActiveSpan(extenErr, span)
            throw new GraphQLError(extenErr, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'BAD_USER_INPUT',
                },
            })
        }

        const s3Key = `${uuidv4()}.${extension}`
        const bucketName: BucketShortName = 'QUESTION_ANSWER_DOCS'

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
            expiresIn,
        }
    }
}

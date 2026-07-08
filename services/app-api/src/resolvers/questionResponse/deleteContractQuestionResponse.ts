import type { MutationResolvers } from '../../gen/gqlServer'
import { isAdminUser } from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { createForbiddenError } from '../errorUtils'
import {
    NotFoundError,
    UserInputPostgresError,
    handleUserInputPostgresError,
    type Store,
} from '../../postgres'
import { GraphQLError } from 'graphql'
import { canWrite } from '../../oauth/oauthAuthorization'

export function deleteContractQuestionResponseResolver(
    store: Store
): MutationResolvers['deleteContractQuestionResponse'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'deleteContractQuestionResponse',
            { 'questionResponse.id': input.responseID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canWrite(context)) {
                    const errMessage =
                        'OAuth clients are not authorized to delete question responses'
                    logResolverError(
                        'deleteContractQuestionResponse',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'OAUTH_NOT_ALLOWED',
                        },
                    })
                }

                if (!isAdminUser(user)) {
                    const errMessage =
                        'user not authorized to delete a question response'
                    logResolverError(
                        'deleteContractQuestionResponse',
                        errMessage,
                        context
                    )
                    throw createForbiddenError(errMessage)
                }

                const result = await store.softDeleteContractQuestionResponse(
                    input.responseID,
                    user,
                    input.reason
                )

                if (result instanceof Error) {
                    if (result instanceof NotFoundError) {
                        const errMessage = `Response with id ${input.responseID} does not exist`
                        logResolverError(
                            'deleteContractQuestionResponse',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    if (result instanceof UserInputPostgresError) {
                        logResolverError(
                            'deleteContractQuestionResponse',
                            result.message,
                            context
                        )
                        throw handleUserInputPostgresError(
                            result,
                            'responseID',
                            input.responseID
                        )
                    }

                    const errMessage = `Issue soft deleting contract question response. Message: ${result.message}`
                    logResolverError(
                        'deleteContractQuestionResponse',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('deleteContractQuestionResponse', context)
                return { question: result }
            }
        )
    }
}

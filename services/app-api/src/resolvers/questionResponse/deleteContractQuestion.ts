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
import { canOauthWrite } from '../../oauth/oauthAuthorization'
import type { LDService } from '../../launchDarkly/launchDarkly'

export function deleteContractQuestionResolver(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['deleteContractQuestion'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'deleteContractQuestion',
            { 'question.id': input.questionID },
            async (span) => {
                setResolverDetails(span, user)

                const featureFlags = await launchDarkly.allFlags({
                    key: context.user.email,
                })

                if (!canOauthWrite(context, featureFlags)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'deleteContractQuestion',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!isAdminUser(user)) {
                    const errMessage =
                        'user not authorized to delete a question'
                    logResolverError(
                        'deleteContractQuestion',
                        errMessage,
                        context
                    )
                    throw createForbiddenError(errMessage)
                }

                const result = await store.softDeleteContractQuestion(
                    input.questionID,
                    user,
                    input.reason
                )

                if (result instanceof Error) {
                    if (result instanceof NotFoundError) {
                        const errMessage = `Question with id ${input.questionID} does not exist`
                        logResolverError(
                            'deleteContractQuestion',
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
                            'deleteContractQuestion',
                            result.message,
                            context
                        )
                        throw handleUserInputPostgresError(
                            result,
                            'questionID',
                            input.questionID
                        )
                    }

                    const errMessage = `Issue soft deleting contract question. Message: ${result.message}`
                    logResolverError(
                        'deleteContractQuestion',
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

                logResolverSuccess(
                    context.oauthClient
                        ? 'deleteContractQuestion - oauthClient'
                        : 'deleteContractQuestion',
                    context
                )
                return { question: result }
            }
        )
    }
}

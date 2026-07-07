import { GraphQLError } from 'graphql'
import { canOauthAdminWrite } from '../../oauth/oauthAuthorization'
import { isAdminUser } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'

const isOverrideUserInputError = (message: string): boolean =>
    message.startsWith('Invalid ') ||
    message.startsWith('Cannot override data') ||
    message.startsWith('Could not find latest submitted')

export function overrideRateData(
    store: Store
): MutationResolvers['overrideRateData'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'overrideRateData',
            { 'mcreview.rate_id': input.rateID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canOauthAdminWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('overrideRateData', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!isAdminUser(user)) {
                    const errMessage =
                        'user not authorized to override rate data'
                    logResolverError('overrideRateData', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const rateResult = await store.findRateWithHistory(input.rateID)
                if (rateResult instanceof Error) {
                    logResolverError(
                        'overrideRateData',
                        rateResult.message,
                        context
                    )

                    if (rateResult instanceof NotFoundError) {
                        throw new GraphQLError(rateResult.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    throw new GraphQLError(rateResult.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (
                    !['SUBMITTED', 'RESUBMITTED'].includes(
                        rateResult.consolidatedStatus
                    )
                ) {
                    const errMessage = `Cannot override data, rate consolidated status must be SUBMITTED or RESUBMITTED. Consolidated status: ${rateResult.consolidatedStatus}`
                    logResolverError('overrideRateData', errMessage, context)
                    throw createUserInputError(errMessage, 'rateID')
                }

                const result = await store.overrideRateData({
                    rateID: input.rateID,
                    updatedByID: user.id,
                    description: input.description,
                    overrides: {
                        initiallySubmittedAt:
                            input.overrides.initiallySubmittedAt,
                        initiallySubmittedAtOp:
                            input.overrides.initiallySubmittedAtOp,
                        revisionOverride: input.overrides.revisionOverride
                            ? {
                                  rateDocuments:
                                      input.overrides.revisionOverride
                                          .rateDocuments ?? undefined,
                                  supportingDocuments:
                                      input.overrides.revisionOverride
                                          .supportingDocuments ?? undefined,
                              }
                            : undefined,
                    },
                })

                if (result instanceof Error) {
                    logResolverError(
                        'overrideRateData',
                        result.message,
                        context
                    )

                    if (result instanceof NotFoundError) {
                        throw new GraphQLError(result.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    if (isOverrideUserInputError(result.message)) {
                        throw createUserInputError(
                            result.message,
                            'input',
                            input
                        )
                    }

                    throw new GraphQLError(result.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('overrideRateData', context)

                return { rate: result }
            }
        )
    }
}

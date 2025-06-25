import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { canRead, canAccessState, getAuthContextInfo } from '../../authorization/oauthAuthorization'

export function fetchContractResolver(
    store: Store
): QueryResolvers['fetchContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        // add a span to OTEL
        const span = tracer?.startSpan('fetchContractResolver', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchContract', user, span)

        const contractWithHistory = await store.findContractWithHistory(
            input.contractID
        )

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (contractWithHistory instanceof NotFoundError) {
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Check OAuth client permissions first
        if (!canRead(context)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = `OAuth client ${authInfo.clientId} does not have read permissions`
            logError('fetchContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        // Check state-based access (works for both OAuth clients and regular users)
        if (!canAccessState(context, contractWithHistory.stateCode)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = authInfo.isOAuthClient 
                ? `OAuth client ${authInfo.clientId} not allowed to access contract from ${contractWithHistory.stateCode}`
                : `User from state ${user.stateCode} not allowed to access contract from ${contractWithHistory.stateCode}`
            logError('fetchContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INVALID_STATE_REQUESTER',
                },
            })
        }

        setSuccessAttributesOnActiveSpan(span)
        return { contract: contractWithHistory }
    }
}

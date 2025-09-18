import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import {
    isStateUser,
    hasCMSPermissions,
    hasAdminPermissions,
} from '../../domain-models'
import {
    canRead,
    getAuthContextInfo,
} from '../../authorization/oauthAuthorization'
import { logError, logSuccess } from '../../logger'
import type { DocumentZipService } from '../../zip/generateZip'

export function fetchContractResolver(
    store: Store,
    documentZip: DocumentZipService
): QueryResolvers['fetchContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        // add a span to OTEL
        const span = tracer?.startSpan('fetchContractResolver', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchContract', user, span)

        // Check OAuth client read permissions
        if (!canRead(context)) {
            const errMessage = `OAuth client does not have read permissions`
            logError('fetchContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

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

        // Log OAuth client access for audit trail
        if (context.oauthClient?.isOAuthClient) {
            logSuccess('fetchContract')
        }

        // Authorization check (same for both OAuth clients and regular users)
        if (isStateUser(user)) {
            if (user.stateCode !== contractWithHistory.stateCode) {
                const authInfo = getAuthContextInfo(context)
                const errMessage = authInfo.isOAuthClient
                    ? `OAuth client not allowed to access contract from ${contractWithHistory.stateCode}`
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
        } else if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
            const errMessage = 'User not allowed to access contract'
            logError('fetchContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INVALID_STATE_REQUESTER',
                },
            })
        }
        // Generate zips!
        const contractZipRes = await documentZip.createContractZips(
            contractWithHistory,
            span
        )
        if (contractZipRes instanceof Error) {
            const errMessage = `Failed to zip files for contract revision with ID: ${contractWithHistory.packageSubmissions[0]?.contractRevision.id}: ${contractZipRes.message}`
            logError('fetchContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
        }

        const rateZipRes = await documentZip.createRateZips(
            contractWithHistory,
            span
        )
        if (rateZipRes instanceof Array) {
            const errorMessage = `Failed to zip files for ${rateZipRes.length} rate revision(s) on contract ${contractWithHistory.packageSubmissions[0]?.contractRevision.id}`
            logError('fetchContract', errorMessage)
            setErrorAttributesOnActiveSpan(errorMessage, span)

            rateZipRes.forEach((error, index) => {
                logError(
                    'fetchContract',
                    `Rate zip error ${index + 1}: ${error.message}`
                )
            })
        }
        logSuccess('fetchContract')
        setSuccessAttributesOnActiveSpan(span)
        return { contract: contractWithHistory }
    }
}

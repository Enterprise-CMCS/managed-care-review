import { ForbiddenError } from 'apollo-server-lambda'
import {
    isStateUser,
    packageStatus,
    convertContractWithRatesToUnlockedHPP,
    hasAdminPermissions,
    hasCMSPermissions,
} from '../../domain-models'
import type { QueryResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql/index'
import { NotFoundError } from '../../postgres'
import { canRead, canAccessState, hasCMSPermissions as hasOAuthCMSPermissions, getAuthContextInfo } from '../../authorization/oauthAuthorization'

export function fetchHealthPlanPackageResolver(
    store: Store
): QueryResolvers['fetchHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('fetchHealthPlanPackage', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchHealthPlanPackage', user, span)

        // Fetch the full contract
        const contractWithHistory = await store.findContractWithHistory(
            input.pkgID
        )

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding a contract with history with id ${input.pkgID}. Message: ${contractWithHistory.message}`
            logError('fetchHealthPlanPackage', errMessage)

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

        const convertedPkg =
            convertContractWithRatesToUnlockedHPP(contractWithHistory)

        if (convertedPkg instanceof Error) {
            const errMessage = `Issue converting contract. Message: ${convertedPkg.message}`
            logError('fetchHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'PROTO_DECODE_ERROR',
                },
            })
        }

        const pkg = convertedPkg

        // Check OAuth client permissions first
        if (!canRead(context)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = `OAuth client ${authInfo.clientId} does not have read permissions`
            logError('fetchHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // Check state-based access (works for both OAuth clients and regular users)
        if (!canAccessState(context, pkg.stateCode)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = authInfo.isOAuthClient 
                ? `OAuth client ${authInfo.clientId} not authorized to fetch data from ${pkg.stateCode}`
                : 'user not authorized to fetch data from a different state'
            logError('fetchHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // Check draft access - OAuth clients inherit CMS permissions from their associated user
        if (hasOAuthCMSPermissions(context)) {
            // OAuth clients with CMS users can access non-draft packages
            // Regular CMS/Admin users can access non-draft packages
            if (packageStatus(pkg) === 'DRAFT') {
                const authInfo = getAuthContextInfo(context)
                const errMessage = authInfo.isOAuthClient
                    ? `OAuth client ${authInfo.clientId} not authorized to fetch a draft`
                    : 'user not authorized to fetch a draft'
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new ForbiddenError(errMessage)
            }
        }

        logSuccess('fetchHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)
        return { pkg }
    }
}

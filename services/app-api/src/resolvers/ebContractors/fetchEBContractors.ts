import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { canRead } from '../../oauth/oauthAuthorization'
import { logResolverError, logResolverSuccess } from '../../logger'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createInternalServerError } from '../errorUtils'

export function fetchEBContractorsResolver(
    store: Store
): QueryResolvers['fetchEBContractors'] {
    return async (_parent, { input }, context) =>
        withResolverSpan(
            context,
            'fetchEBContractors',
            undefined,
            async (span) => {
                setResolverDetails(span, context.user)
                if (!canRead(context)) {
                    throw createForbiddenError(
                        'OAuth client does not have read permissions'
                    )
                }
                const contractors = await store.findEBContractors(
                    input.includeDeprecated ?? false
                )
                if (contractors instanceof Error) {
                    logResolverError(
                        'fetchEBContractors',
                        contractors.message,
                        context
                    )
                    throw createInternalServerError(
                        'Error fetching EB contractors',
                        'DB_ERROR'
                    )
                }
                logResolverSuccess('fetchEBContractors', context)
                return {
                    totalCount: contractors.length,
                    edges: contractors.map((node) => ({ node })),
                }
            }
        )
}

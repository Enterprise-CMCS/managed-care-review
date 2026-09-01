import { hasReadPermissions } from '../../domain-models'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Context } from '../../handlers/apollo_gql'
import { logResolverError, logResolverSuccess } from '../../logger'
import { canRead } from '../../oauth/oauthAuthorization'
import type { Store } from '../../postgres'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createInternalServerError } from '../errorUtils'

export function getAllStateProgramsResolver(
    store: Store
): QueryResolvers['getAllStatePrograms'] {
    return async (_parent: unknown, _args: unknown, context: Context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'getAllStatePrograms',
            undefined,
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage =
                        'OAuth client does not have read permissions'
                    logResolverError('getAllStatePrograms', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                if (!hasReadPermissions(user)) {
                    const errMessage =
                        'State users are not authorized to fetch all state programs'
                    logResolverError('getAllStatePrograms', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const statePrograms = await store.findAllStatePrograms()
                if (statePrograms instanceof Error) {
                    const errMessage = `Issue finding all state programs: ${statePrograms.message}`
                    logResolverError('getAllStatePrograms', errMessage, context)
                    throw createInternalServerError(errMessage)
                }

                const edges = statePrograms.map(
                    ({ stateCode, stateName, program }) => ({
                        stateCode,
                        stateName,
                        node: program,
                    })
                )

                logResolverSuccess('getAllStatePrograms', context)

                return {
                    totalCount: edges.length,
                    edges,
                }
            }
        )
    }
}

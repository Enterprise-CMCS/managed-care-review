import { GraphQLError } from 'graphql/error'
import { hasReadPermissions } from '../../domain-models'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import { canRead } from '../../oauth/oauthAuthorization'
import type { Store } from '../../postgres'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createNotFoundError } from '../errorUtils'

export function fetchStateUserResolver(
    store: Store
): QueryResolvers['fetchStateUser'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser } = context

        return withResolverSpan(
            context,
            'indexUsers',
            undefined,
            async (span) => {
                setResolverDetails(span, currentUser)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('fetchStateUser', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                if (!hasReadPermissions(currentUser)) {
                    const errMessage = 'user not authorized to fetch users'
                    logResolverError('fetchStateUser', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const findResult = await store.findStateUser({
                    email: input.email,
                    givenName: input.givenName,
                    familyName: input.familyName,
                })

                if (findResult instanceof Error) {
                    const errMessage = `Error querying state user. ${findResult.message}`
                    logResolverError('fetchStateUser', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (findResult === undefined) {
                    const errMessage = `No state user found with email: ${input.email}, givenName: ${input.givenName}, familyName: ${input.familyName}`
                    logResolverError('fetchStateUser', errMessage, context)
                    throw createNotFoundError(errMessage)
                }

                logResolverSuccess('fetchStateUser', context)
                return { user: findResult }
            }
        )
    }
}

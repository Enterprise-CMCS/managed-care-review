import type { QueryResolvers } from '../../gen/gqlServer'
import { logSuccess } from '../../logger'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'

export function fetchCurrentUserResolver(): QueryResolvers['fetchCurrentUser'] {
    return async (_parent, _args, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchCurrentUser',
            undefined,
            async (span) => {
                setResolverDetails(span, user)
                logSuccess('fetchCurrentUser')
                return context.user
            }
        )
    }
}

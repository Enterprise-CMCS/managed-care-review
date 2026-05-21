import type { QueryResolvers } from '../../gen/gqlServer'
import { logResolverSuccess } from '../../logger'
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
                logResolverSuccess('fetchCurrentUser', context)
                return context.user
            }
        )
    }
}

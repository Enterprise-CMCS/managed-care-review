import type { QueryResolvers } from '../../gen/gqlServer'
import { logSuccess } from '../../logger'
import {
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'

export function fetchCurrentUserResolver(): QueryResolvers['fetchCurrentUser'] {
    return async (_parent, _args, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchCurrentUser', user, span)
        setSuccessAttributesOnActiveSpan(span)
        logSuccess('fetchCurrentUser')
        return context.user
    }
}

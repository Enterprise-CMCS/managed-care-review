import { QueryResolvers } from '../gen/gqlServer'
import { logSuccess } from '../logger'

export function fetchCurrentUserResolver(): QueryResolvers['fetchCurrentUser'] {
    logSuccess('fetchCurrentUser')
    return async (_parent, _args, context) => {
        return context.user
    }
}

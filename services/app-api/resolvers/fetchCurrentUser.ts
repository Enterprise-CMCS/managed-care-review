import { QueryResolvers } from '../gen/gqlServer'

export function fetchCurrentUserResolver(): QueryResolvers['fetchCurrentUser'] {
    return async (_parent, _args, context) => {
        return context.user
    }
}

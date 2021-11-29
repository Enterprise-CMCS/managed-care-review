import { QueryResolvers } from '../gen/gqlServer'

export function fetchCurrentUserResolver(): QueryResolvers['fetchCurrentUser'] {
    console.info({
        message: 'fetchCurrentUser succeeded',
        operation: 'fetchCurrentUser',
        status: 'SUCCESS',
    })
    return async (_parent, _args, context) => {
        return context.user
    }
}

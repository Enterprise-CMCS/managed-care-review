import {  QueryResolvers } from '../gen/gqlServer'

export function getCurrentUserResolver(): QueryResolvers["getCurrentUser"] {
    return async (_parent, _args, context) => {
        return context.user
    }
}

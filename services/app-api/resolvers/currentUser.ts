import { Resolver, ResolverTypeWrapper, User } from '../gen/gqlServer'

export function getCurrentUserResolver(): Resolver<
    ResolverTypeWrapper<Partial<User>>,
    Record<string, unknown>,
    any, // eslint-disable-line @typescript-eslint/no-explicit-any
    Record<string, unknown>
> {
    return async (_parent, _args, context) => {
        return context.user
    }
}

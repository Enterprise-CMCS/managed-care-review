import { AuthenticationError } from 'apollo-server-lambda'

import { Resolver, ResolverTypeWrapper, User } from '../gen/gqlServer'

import { userFromAuthProvider } from '../authn'

// getCurrentUserResolver is a function that returns a configured Resover
// you have to call it with it's dependencies to pass it into the Resover tree
// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export function getCurrentUserResolver(
    userFetcher: userFromAuthProvider
): Resolver<
    ResolverTypeWrapper<Partial<User>>,
    Record<string, unknown>,
    any,
    Record<string, unknown>
> {
    return async (_parent, _args, context) => {
        const authProvider =
            context.event.requestContext.identity.cognitoAuthenticationProvider
        if (authProvider == undefined) {
            throw new AuthenticationError(
                'This should have been caught by localAuthMiddleware'
            )
        }

        const userResult = await userFetcher(authProvider)

        if (userResult.isErr()) {
            throw new AuthenticationError(userResult.error.message)
        }

        console.log('nonono')
        await new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve()
            }, 500)
        })

        return userResult.value
    }
}

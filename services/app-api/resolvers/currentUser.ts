import { AuthenticationError } from 'apollo-server-lambda'

import { ResolverFn, ResolversTypes } from '../gen/gqlServer'

import { userFromAuthProvider } from '../authn'

// getCurrentUserResolver is a function that returns a configured Resover
// you have to call it with it's dependencies to pass it into the Resover tree
export function getCurrentUserResolver(
	userFetcher: userFromAuthProvider
): ResolverFn<ResolversTypes['User'], {}, any, {}> {
	return async (_parent, _args, context) => {
		const authProvider =
			context.event.requestContext.identity.cognitoAuthenticationProvider
		if (authProvider == undefined) {
			throw new AuthenticationError(
				'This should have been caught by localAuthMiddleware'
			)
		}

		console.log(
			'and the idenity',
			context.event.requestContext.identity.cognitoIdentityId
		)

		const userResult = await userFetcher(authProvider)

		if (userResult.isErr()) {
			throw new AuthenticationError(userResult.error.message)
		}

		return userResult.value
	}
}

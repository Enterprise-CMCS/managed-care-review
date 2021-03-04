import { AuthenticationError } from 'apollo-server-lambda'

import { ResolverFn, ResolversTypes } from '../gen/gqlServer'

import {
	userFromAuthProvider,
	userFromCognitoAuthProvider,
	userFromLocalAuthProvider,
} from '../authn'

// export async function currentUser(_parent, _args, context) {
export const getCurrentUserResolver: ResolverFn<
	ResolversTypes['User'],
	{},
	any,
	{}
> = async (_parent, _args, context) => {
	let userFetcher: userFromAuthProvider

	if (process.env.REACT_APP_LOCAL_LOGIN) {
		userFetcher = userFromLocalAuthProvider
	} else {
		userFetcher = userFromCognitoAuthProvider
	}

	const authProvider =
		context.event.requestContext.identity.cognitoAuthenticationProvider
	if (authProvider == undefined) {
		throw new AuthenticationError(
			'This should have been caught by localAuthMiddleware'
		)
	}

	console.log('CHECKING ON authProvider: ', authProvider)

	const userResult = await userFetcher(authProvider)

	if (userResult.isErr()) {
		throw new AuthenticationError(userResult.error.message)
	}

	return userResult.value
}

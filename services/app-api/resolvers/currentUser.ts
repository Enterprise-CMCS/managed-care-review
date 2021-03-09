import { AuthenticationError } from 'apollo-server-lambda'

import { ResolverFn, ResolversTypes } from '../gen/gqlServer'

import {
	userFromAuthProvider,
	userFromCognitoAuthProvider,
	userFromLocalAuthProvider,
} from '../authn'
import { assertIsAuthMode } from '../../app-web/src/common-code/domain-models'

// export async function currentUser(_parent, _args, context) {
export const getCurrentUserResolver: ResolverFn<
	ResolversTypes['User'],
	{},
	any,
	{}
> = async (_parent, _args, context) => {
	let userFetcher: userFromAuthProvider

	const authMode = process.env.REACT_APP_AUTH_MODE
	assertIsAuthMode(authMode)

	if (authMode === 'LOCAL') {
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

	console.log(
		'and the idenity',
		context.event.requestContext.identity.cognitoIdentityId
	)

	console.log('CHECKING ON authProvider: ', authProvider)

	const userResult = await userFetcher(authProvider)

	if (userResult.isErr()) {
		throw new AuthenticationError(userResult.error.message)
	}

	return userResult.value
}

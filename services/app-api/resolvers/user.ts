// import { ResolverTypeWrapper, User } from '../gen/gqlServer'
import { AuthenticationError } from 'apollo-server-lambda'
import { UserResolvers } from '../gen/gqlServer'

import {
	userFromAuthProvider,
	userFromCognitoAuthProvider,
	userFromLocalAuthProvider,
} from '../authn'

export const userResolver: UserResolvers<any> = async (
	_parent,
	_args,
	context
) => {
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

	const userResult = await userFetcher(authProvider)

	if (userResult.isErr()) {
		throw new AuthenticationError(userResult.error.message)
	}

	// return userResult.value
	const user = userResult.value
	return {
		role: user.role,
		name: user.name,
		email: user.email,
		state: () => {
			return {
				name: 'Florida',
				code: 'FL',
				programs: [],
			}
		},
	}
}

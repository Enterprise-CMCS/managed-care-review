import { AuthenticationError } from 'apollo-server-lambda'

import { ResolverFn, ResolversTypes } from '../gen/gqlServer'

import {
	userFromAuthProvider,
	userFromCognitoAuthProvider,
	userFromLocalAuthProvider,
} from '../authn'

import statePrograms from '../data/statePrograms.json'

// export async function currentUser(_parent, _args, context) {
export const getStateResolver: ResolverFn<
	ResolversTypes['State'],
	// eslint-disable-next-line @typescript-eslint/ban-types
	{},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	any,
	// eslint-disable-next-line @typescript-eslint/ban-types
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

	const userResult = await userFetcher(authProvider)

	if (userResult.isErr()) {
		throw new AuthenticationError(userResult.error.message)
	}

	// we have a valid user.
	const userState = userResult.value.state // hard code for now.

	const state = statePrograms.states.find((st) => st.code === userState)

	if (state === undefined) {
		throw new Error('No state data for users state: ' + userState)
	}

	return state
}

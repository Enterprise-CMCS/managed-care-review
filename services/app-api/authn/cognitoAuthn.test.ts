import { Result, ok, err } from 'neverthrow'
import { parseAuthProvider } from './cognitoAuthn'

describe('parseAuthProvider', () => {

	it('parses valid and invalid strings', () => {

		type authProviderTest = {
			provider: string;
			expectedResult: Result<{userId: string; poolId: string}, Error>;
		}

		const tests: authProviderTest[] = [
			{ provider: 'cognito-idp.us-east-1.amazonaws.com/us-east-1_9uqvrgbHM,cognito-idp.us-east-1.amazonaws.com/us-east-1_9uqvrgbHM:CognitoSignIn:09882a37-fbeb-423d-a989-da7f43fdb252', 
				expectedResult: ok({userId: '09882a37-fbeb-423d-a989-da7f43fdb252', poolId: 'us-east-1_9uqvrgbHM'}) },
			{ provider: 'foo', expectedResult: err(new Error('authProvider doesnt have enough parts'))},
		]

		tests.forEach( (test) => {
			const actualResult = parseAuthProvider(test.provider)

			expect(actualResult).toEqual(test.expectedResult)
		})

	})

})
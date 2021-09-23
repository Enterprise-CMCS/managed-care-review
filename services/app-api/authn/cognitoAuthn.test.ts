import { Result, ok, err } from 'neverthrow'
import { parseAuthProvider, userTypeFromAttributes } from './cognitoAuthn'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models'

describe('cognitoAuthn', () => {
    describe('parseAuthProvider', () => {
        it('parses valid and invalid strings', () => {
            type authProviderTest = {
                provider: string
                expectedResult: Result<
                    { userId: string; poolId: string },
                    Error
                >
            }

            const tests: authProviderTest[] = [
                {
                    provider:
                        'cognito-idp.us-east-1.amazonaws.com/us-east-1_9uqvrgbHM,cognito-idp.us-east-1.amazonaws.com/us-east-1_9uqvrgbHM:CognitoSignIn:09882a37-fbeb-423d-a989-da7f43fdb252',
                    expectedResult: ok({
                        userId: '09882a37-fbeb-423d-a989-da7f43fdb252',
                        poolId: 'us-east-1_9uqvrgbHM',
                    }),
                },
                {
                    provider: 'foo',
                    expectedResult: err(
                        new Error('authProvider doesnt have enough parts')
                    ),
                },
            ]

            tests.forEach((test) => {
                const actualResult = parseAuthProvider(test.provider)

                expect(actualResult).toEqual(test.expectedResult)
            })
        })
    })

    describe('userTypeFromAttributes', () => {
        it('parses SAML attributes as expected', () => {
            type samlAttrTest = {
                attributes: { [name: string]: string }
                expectedResult: Result<CognitoUserType, Error>
            }

            const tests: samlAttrTest[] = [
                {
                    attributes: {
                        'custom:role': 'macmcrrs-state-user',
                        'custom:state_code': 'VA',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: ok({
                        role: 'STATE_USER',
                        email: 'gp@example.com',
                        name: 'Generic Person',
                        state_code: 'VA',
                    }),
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-cms-user',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: ok({
                        role: 'CMS_USER',
                        email: 'gp@example.com',
                        name: 'Generic Person',
                    }),
                },
                {
                    attributes: {
                        'custom:role':
                            'SOME_OPE User,neid-lame-user,smacfi-enduser,twoell-mmc-user,wefoi-mmc-ab-auth-user,POSS_ENDUSER,strongweak-user,macmcrrs-state-user',
                        'custom:state_code': 'FL',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: ok({
                        role: 'STATE_USER',
                        email: 'gp@example.com',
                        name: 'Generic Person',
                        state_code: 'FL',
                    }),
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-cms-user,macmcrrs-state-user',
                        'custom:state_code': 'FL',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: ok({
                        role: 'STATE_USER',
                        email: 'gp@example.com',
                        name: 'Generic Person',
                        state_code: 'FL',
                    }),
                },
                {
                    attributes: {
                        'custom:role':
                            'SOME_OPE User,neid-lame-user,smacfi-enduser,twoell-mmc-user,wefoi-mmc-ab-auth-user,POSS_ENDUSER,strongweak-user,ma-user',
                        'custom:state_code': 'FL',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: err(
                        new Error(
                            'Unsupported user role:  SOME_OPE User,neid-lame-user,smacfi-enduser,twoell-mmc-user,wefoi-mmc-ab-auth-user,POSS_ENDUSER,strongweak-user,ma-user'
                        )
                    ),
                },
                {
                    attributes: { foo: 'bar' },
                    expectedResult: err(
                        new Error(
                            'User does not have all the required attributes: {"foo":"bar"}'
                        )
                    ),
                },
            ]

            tests.forEach((test) => {
                const actualResult = userTypeFromAttributes(test.attributes)

                expect(actualResult).toEqual(test.expectedResult)
            })
        })
    })
})

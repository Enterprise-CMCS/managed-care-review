import { Result, ok, err } from 'neverthrow'
import { CognitoIdentityServiceProvider } from 'aws-sdk'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models'

export function parseAuthProvider(
    authProvider: string
): Result<{ userId: string; poolId: string }, Error> {
    // Cognito authentication provider looks like:
    // cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx,cognito-idp.us-east-1.amazonaws.com/us-east-1_aaaaaaaaa:CognitoSignIn:qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr
    // Where us-east-1_aaaaaaaaa is the User Pool id
    // And qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr is the User Pool User Id

    try {
        const parts = authProvider.split(':')
        const userPoolIdParts = parts[parts.length - 3].split('/')

        const userPoolId = userPoolIdParts[userPoolIdParts.length - 1]
        const userPoolUserId = parts[parts.length - 1]

        return ok({ userId: userPoolUserId, poolId: userPoolId })
    } catch (e) {
        // console.log(e)
        return err(new Error('authProvider doesnt have enough parts'))
    }
}

function userAttrDict(
    cognitoUser: CognitoIdentityServiceProvider.AdminGetUserResponse
): { [key: string]: string } {
    const attributes: { [key: string]: string } = {}

    if (cognitoUser.UserAttributes) {
        cognitoUser.UserAttributes.forEach((attribute) => {
            if (attribute.Value) {
                attributes[attribute.Name] = attribute.Value
            }
        })
    }

    return attributes
}

// userFromCognitoAuthProvider hits the Cogntio API to get the information in the authProvider
export async function userFromCognitoAuthProvider(
    authProvider: string
): Promise<Result<CognitoUserType, Error>> {
    const parseResult = parseAuthProvider(authProvider)
    if (parseResult.isErr()) {
        return err(parseResult.error)
    }

    const userInfo = parseResult.value

    // calling a dependency so we have to try
    try {
        const cognito = new CognitoIdentityServiceProvider()
        const userResponse = await cognito
            .adminGetUser({
                Username: userInfo.userId,
                UserPoolId: userInfo.poolId,
            })
            .promise()

        // we lose type safety here...
        const attributes = userAttrDict(userResponse)

        if (
            !(
                'email' in attributes &&
                'given_name' in attributes &&
                'family_name' in attributes &&
                'custom:state_code' in attributes
            )
        ) {
            return err(
                new Error(
                    'User does not have all the expected attributes: ' +
                        JSON.stringify(attributes)
                )
            )
        }

        const user: CognitoUserType = {
            email: attributes.email,
            name: attributes.given_name + ' ' + attributes.family_name,
            // HELP
            state_code: attributes['custom:state_code'],
            role: 'STATE_USER',
        }

        return ok(user)
    } catch (e) {
        return err(e)
    }
}

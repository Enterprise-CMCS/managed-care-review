import { Result, ok, err } from 'neverthrow'
import { CognitoIdentityServiceProvider } from 'aws-sdk'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models'
import { performance } from 'perf_hooks'

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

// pulls the data from the cognito user into a dictionary
function userAttrDict(
    cognitoUser: CognitoIdentityServiceProvider.UserType
): { [key: string]: string } {
    const attributes: { [key: string]: string } = {}

    if (cognitoUser.Attributes) {
        cognitoUser.Attributes.forEach((attribute) => {
            if (attribute.Value) {
                attributes[attribute.Name] = attribute.Value
            }
        })
    }

    return attributes
}

async function fetchUserFromCognito(
    userID: string,
    poolID: string
): Promise<CognitoIdentityServiceProvider.UserType | Error> {
    const cognito = new CognitoIdentityServiceProvider()

    const subFilter = `sub = "${userID}"`

    // let's see what we've got
    const startRequest = performance.now()
    const listUsersResponse = await cognito
        .listUsers({
            UserPoolId: poolID,
            Filter: subFilter,
        })
        .promise()
    const endRequest = performance.now()
    console.log('listUsers takes ms:', endRequest - startRequest)

    const userResp: CognitoIdentityServiceProvider.ListUsersResponse = listUsersResponse

    if (userResp.Users === undefined || userResp.Users.length !== 1) {
        // logerror
        return new Error('No user found with this sub')
    }

    const currentUser = userResp.Users[0]
    return currentUser
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
        const fetchResult = await fetchUserFromCognito(
            userInfo.userId,
            userInfo.poolId
        )

        if ('name' in fetchResult) {
            return err(fetchResult)
        }

        const currentUser: CognitoIdentityServiceProvider.UserType = fetchResult

        // we lose type safety here...
        const attributes = userAttrDict(currentUser)
        if (
            !(
                'email' in attributes &&
                'custom:state_code' in attributes &&
                'given_name' in attributes &&
                'family_name' in attributes
            )
        ) {
            return err(
                new Error(
                    'User does not have all the required attributes: ' +
                        JSON.stringify(attributes)
                )
            )
        }

        console.log('got user attr dict: ', attributes)

        const fullName = attributes.given_name + ' ' + attributes.family_name

        const user: CognitoUserType = {
            email: attributes.email,
            name: fullName,
            state_code: attributes['custom:state_code'],
            role: 'STATE_USER',
        }

        return ok(user)
    } catch (e) {
        console.log('cognito ERR', e)
        return err(e)
    }
}

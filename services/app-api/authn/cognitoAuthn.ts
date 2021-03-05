import { Result, ok, err } from 'neverthrow'
import { CognitoIdentityServiceProvider } from 'aws-sdk'
import {
    StateUserType,
    UserType,
} from '../../app-web/src/common-code/domain-models/user'
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

// userFromCognitoAuthProvider hits the Cogntio API to get the information in the authProvider
export async function userFromCognitoAuthProvider(
    authProvider: string
): Promise<Result<UserType, Error>> {
    console.log('parsing:', authProvider)
    const parseResult = parseAuthProvider(authProvider)
    if (parseResult.isErr()) {
        return err(parseResult.error)
    }

    const userInfo = parseResult.value
    console.log('it parsed!', userInfo)

    // TODO: This is different in IDM?
    // userInfo.poolId = userInfo.poolId + '_Okta'

    // calling a dependency so we have to try
    try {
        const cognito = new CognitoIdentityServiceProvider()

        const subFilter = `sub = \"${userInfo.userId}\"`
        console.log('SUB FIL', subFilter)

        // let's see what we've got
        const startRequest = performance.now()
        const listUsersResponse = await cognito
            .listUsers({
                UserPoolId: userInfo.poolId,
                Filter: subFilter,
            })
            .promise()

        const endRequest = performance.now()
        console.log('listUsers takes ms:', endRequest - startRequest)
        const userResp: CognitoIdentityServiceProvider.ListUsersResponse = listUsersResponse

        console.log('got Users: ', userResp)

        console.log('got actual users: ', JSON.stringify(userResp.Users))

        if (userResp.Users === undefined || userResp.Users.length !== 1) {
            // logerror
            return err(new Error('No user found with this sub'))
        }

        const currentUser = userResp.Users[0]

        // we lose type safety here...
        const attributes = userAttrDict(currentUser)
        if (!('email' in attributes && 'custom:state_code' in attributes)) {
            return err(
                new Error(
                    'User does not have all the required attributes: ' +
                        JSON.stringify(attributes)
                )
            )
        }

        let fullName: string
        // the IDM connection is not providing given_name or family_name, that's just on Cognito
        // once we know what IDM is actually going to give us we can re-work this
        if ('given_name' in attributes && 'family_name' in attributes) {
            fullName = attributes.given_name + ' ' + attributes.family_name
        } else {
            fullName = 'Unnamed IDM User'
        }

        const user: StateUserType = {
            email: attributes.email,
            name: fullName,
            state: attributes['custom:state_code'] as UserType['state'],
            role: 'STATE_USER',
        }

        return ok(user)
    } catch (e) {
        console.log('cognito ERR', e)
        return err(e)
    }
}

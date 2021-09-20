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
function userAttrDict(cognitoUser: CognitoIdentityServiceProvider.UserType): {
    [key: string]: string
} {
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

    const userResp: CognitoIdentityServiceProvider.ListUsersResponse =
        listUsersResponse

    if (userResp.Users === undefined || userResp.Users.length !== 1) {
        // logerror
        return new Error('No user found with this sub')
    }

    const currentUser = userResp.Users[0]
    return currentUser
}

// these are the strings sent for the "role" by IDM.
const CMS_ROLE_ATTRIBUTE = 'macmcrrs-cms-user'
const STATE_ROLE_ATTRIBUTE = 'macmcrrs-state-user'

export function userTypeFromAttributes(attributes: {
    [key: string]: string
}): Result<CognitoUserType, Error> {
    // check for all the shared attrs here
    if (
        !(
            'custom:role' in attributes &&
            'email' in attributes &&
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

    const fullName = attributes.given_name + ' ' + attributes.family_name
    // Roles are a list of all the roles a user has in IDM.
    // as of September 2021, it shouldn't be possible for someone to have more than one MC Review role
    const roleAttribute = attributes['custom:role']
    const roles = roleAttribute.split(',')

    if (roles.includes(STATE_ROLE_ATTRIBUTE)) {
        if (!('custom:state_code' in attributes)) {
            return err(
                new Error(
                    'State User does not have all the required attributes: ' +
                        JSON.stringify(attributes)
                )
            )
        }
        return ok({
            role: 'STATE_USER',
            email: attributes.email,
            name: fullName,
            state_code: attributes['custom:state_code'],
        })
    }

    if (roles.includes(CMS_ROLE_ATTRIBUTE)) {
        return ok({
            role: 'CMS_USER',
            email: attributes.email,
            name: fullName,
        })
    }

    return err(new Error('Unsupported user role:  ' + roleAttribute))
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

        // this is asserting that this is an error object, probably a better way to do that.
        if ('name' in fetchResult) {
            return err(fetchResult)
        }

        const currentUser: CognitoIdentityServiceProvider.UserType = fetchResult

        // we lose some type safety here...
        const attributes = userAttrDict(currentUser)

        const user = userTypeFromAttributes(attributes)

        return user
    } catch (e) {
        console.log('cognito ERR', e)
        return err(e)
    }
}

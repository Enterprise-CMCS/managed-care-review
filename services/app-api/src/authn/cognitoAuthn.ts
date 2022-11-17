import { Result, ok, err } from 'neverthrow'
import { CognitoIdentityServiceProvider } from 'aws-sdk'
import { UserType } from '../domain-models'
import { performance } from 'perf_hooks'
import { Store, InsertUserArgsType, isStoreError } from '../postgres'
import { User } from '@prisma/client'

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
}): Result<UserType, Error> {
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
    const roleAttribute = attributes['custom:role']
    const roles = roleAttribute.split(',')

    // Arbitrarily, we check for the state user role first. If a user managed to have both roles, this is a little weird.
    // but as of September 2021, it shouldn't be possible for someone to have more than one MC Review role
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
            givenName: attributes.given_name,
            familyName: attributes.family_name,
        })
    }

    if (roles.includes(CMS_ROLE_ATTRIBUTE)) {
        return ok({
            role: 'CMS_USER',
            email: attributes.email,
            name: fullName,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
        })
    }

    return err(new Error('Unsupported user role:  ' + roleAttribute))
}

// This converts from the Prisma `User` to the app's `UserType`
export function userTypeFromUser(user: User): Result<UserType, Error> {
    if (user.role === 'ADMIN_USER') {
        return ok({
            role: 'ADMIN_USER',
            email: user.email,
            givenName: user.givenName,
            familyName: user.familyName,
            name: user.givenName + ' ' + user.familyName,
        })
    }

    if (user.role === 'CMS_USER') {
        return ok({
            role: 'CMS_USER',
            email: user.email,
            givenName: user.givenName,
            familyName: user.familyName,
            name: user.givenName + ' ' + user.familyName,
        })
    }

    if (user.role === 'STATE_USER') {
        return ok({
            role: 'STATE_USER',
            email: user.email,
            givenName: user.givenName,
            familyName: user.familyName,
            name: user.givenName + ' ' + user.familyName,
            state_code: user.stateCode ?? '',
        })
    }

    return err(new Error('Unsupported user role:  ' + user.role))
}

// userFromCognitoAuthProvider hits the Cogntio API to get the information in the authProvider
export async function userFromCognitoAuthProvider(
    authProvider: string,
    store?: Store
): Promise<Result<UserType, Error>> {
    const parseResult = parseAuthProvider(authProvider)
    if (parseResult.isErr()) {
        return err(parseResult.error)
    }

    const userInfo = parseResult.value
    // if no store is given, we just get user from Cognito
    if (store === undefined) {
        return lookupUserCognito(userInfo.userId, userInfo.poolId)
    }

    // look up the user in PG. If we don't have it here, then we need to
    // fetch it from Cognito.
    const startRequest = performance.now()
    const auroraUser = await lookupUserAurora(store, userInfo.userId)
    if (auroraUser instanceof Error) {
        return err(auroraUser)
    }
    const endRequest = performance.now()
    console.log('User lookup in postgres takes ms:', endRequest - startRequest)

    // if there is no user returned, lookup in cognito and save to postgres
    if (auroraUser === undefined) {
        const cognitoUserResult = await lookupUserCognito(
            userInfo.userId,
            userInfo.poolId
        )
        if (cognitoUserResult.isErr()) {
            return err(cognitoUserResult.error)
        }

        const cognitoUser = cognitoUserResult.value

        // create the user and store it in aurora
        const userToInsert: InsertUserArgsType = {
            userID: userInfo.userId,
            role: cognitoUser.role,
            givenName: cognitoUser.givenName,
            familyName: cognitoUser.familyName,
            email: cognitoUser.email,
        }

        // if it is a state user, insert the state they are from
        if (cognitoUser.role === 'STATE_USER') {
            userToInsert.stateCode = cognitoUser.state_code
        }

        try {
            const result = await store.insertUser(userToInsert)
            if (isStoreError(result)) {
                throw new Error(`Could not insert user: ${result}`)
            }
            return userTypeFromUser(result)
        } catch (e) {
            throw new Error(`Could not insert user: ${e}`)
        }
    }

    // we return the user we got from aurora
    return userTypeFromUser(auroraUser)
}

async function lookupUserCognito(
    userId: string,
    poolId: string
): Promise<Result<UserType, Error>> {
    const fetchResult = await fetchUserFromCognito(userId, poolId)

    // this is asserting that this is an error object, probably a better way to do that.
    if ('name' in fetchResult) {
        return err(fetchResult)
    }

    const currentUser: CognitoIdentityServiceProvider.UserType = fetchResult

    // we lose some type safety here...
    const attributes = userAttrDict(currentUser)

    return userTypeFromAttributes(attributes)
}

async function lookupUserAurora(
    store: Store,
    userID: string
): Promise<User | undefined | Error> {
    try {
        const userFromPG = await store.findUser(userID)
        // try a basic type guard here -- a User will have an email.
        if ('email' in userFromPG) {
            return userFromPG
        }
    } catch (e) {
        throw new Error(`Error looking up user in Postgres: ${e}`)
    }
    return undefined
}

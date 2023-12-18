import type { Result } from 'neverthrow'
import { ok, err } from 'neverthrow'
import type { UserType as CognitoUserType } from '@aws-sdk/client-cognito-identity-provider'
import {
    CognitoIdentityProviderClient,
    ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider'

import type { UserType } from '../domain-models'
import { performance } from 'perf_hooks'
import type { Store, InsertUserArgsType } from '../postgres'
import { isValidCmsDivison } from '../domain-models'

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
function userAttrDict(cognitoUser: CognitoUserType): {
    [key: string]: string
} {
    const attributes: { [key: string]: string } = {}

    if (cognitoUser.Attributes) {
        cognitoUser.Attributes.forEach((attribute) => {
            if (attribute.Value && attribute.Name) {
                attributes[attribute.Name] = attribute.Value
            }
        })
    }

    return attributes
}

async function fetchUserFromCognito(
    userID: string,
    poolID: string
): Promise<CognitoUserType | Error> {
    const cognitoClient = new CognitoIdentityProviderClient({})

    const subFilter = `sub = "${userID}"`

    // let's see what we've got
    const startRequest = performance.now()
    const commandListUsers = new ListUsersCommand({
        UserPoolId: poolID,
        Filter: subFilter,
    })
    const listUsersResponse = await cognitoClient.send(commandListUsers)
    const endRequest = performance.now()
    console.info('listUsers takes ms:', endRequest - startRequest)

    if (
        listUsersResponse.Users === undefined ||
        listUsersResponse.Users.length !== 1
    ) {
        // logerror
        return new Error('No user found with this sub')
    }

    const currentUser = listUsersResponse.Users[0]
    return currentUser
}

// these are the strings sent for the "role" by IDM.
const CMS_ROLE_ATTRIBUTE = 'macmcrrs-cms-user'
const STATE_ROLE_ATTRIBUTE = 'macmcrrs-state-user'
const ADMIN_ROLE_ATTRIBUTE = 'macmcrrs-approver'
const HELPDESK_ROLE_ATTRIBUTE = 'macmcrrs-helpdesk'
const BUSINESSOWNER_ROLE_ATTRIBUTE = 'macmcrrs-bo'

export function userTypeFromAttributes(
    id: string,
    attributes: {
        [key: string]: string
    }
): Result<UserType, Error> {
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
            id,
            role: 'STATE_USER',
            email: attributes.email,
            stateCode: attributes['custom:state_code'],
            givenName: attributes.given_name,
            familyName: attributes.family_name,
        })
    }

    if (roles.includes(CMS_ROLE_ATTRIBUTE)) {
        return ok({
            id,
            role: 'CMS_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
            stateAssignments: [],
            divisionAssignment: isValidCmsDivison(attributes.division)
                ? attributes.division
                : undefined,
        })
    }

    if (roles.includes(ADMIN_ROLE_ATTRIBUTE)) {
        return ok({
            id,
            role: 'ADMIN_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
            stateAssignments: [],
        })
    }

    if (roles.includes(HELPDESK_ROLE_ATTRIBUTE)) {
        return ok({
            id,
            role: 'HELPDESK_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
            stateAssignments: [],
        })
    }

    if (roles.includes(BUSINESSOWNER_ROLE_ATTRIBUTE)) {
        return ok({
            id,
            role: 'BUSINESSOWNER_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
            stateAssignments: [],
        })
    }

    return err(new Error('Unsupported user role:  ' + roleAttribute))
}

// userFromCognitoAuthProvider hits the Cognito API to get the information in the authProvider
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
    console.info('User lookup in postgres takes ms:', endRequest - startRequest)

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
            userToInsert.stateCode = cognitoUser.stateCode
        }

        const result = await store.insertUser(userToInsert)
        if (result instanceof Error) {
            console.error(`Could not insert user: ${JSON.stringify(result)}`)
            return cognitoUserResult
        }
        return ok(result)
    }

    // we return the user we got from aurora
    return ok(auroraUser)
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

    const currentUser: CognitoUserType = fetchResult

    // we lose some type safety here...
    const attributes = userAttrDict(currentUser)

    return userTypeFromAttributes(userId, attributes)
}

export async function lookupUserAurora(
    store: Store,
    userID: string
): Promise<UserType | undefined | Error> {
    const userFromPG = await store.findUser(userID)
    if (userFromPG instanceof Error) {
        return new Error(
            `Error looking up user in postgres: ${userFromPG.message}`
        )
    }

    return userFromPG
}

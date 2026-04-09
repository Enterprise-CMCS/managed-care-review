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
): { userId: string; poolId: string } | Error {
    // Cognito authentication provider looks like:
    // cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx,cognito-idp.us-east-1.amazonaws.com/us-east-1_aaaaaaaaa:CognitoSignIn:qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr
    // Where us-east-1_aaaaaaaaa is the User Pool id
    // And qqqqqqqq-1111-2222-3333-rrrrrrrrrrrr is the User Pool User Id

    try {
        const parts = authProvider.split(':')
        const userPoolIdParts = parts[parts.length - 3].split('/')

        const userPoolId = userPoolIdParts[userPoolIdParts.length - 1]
        const userPoolUserId = parts[parts.length - 1]

        return { userId: userPoolUserId, poolId: userPoolId }
    } catch {
        return new Error('authProvider doesnt have enough parts')
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
    try {
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
            return new Error('No user found with this sub')
        }

        const currentUser = listUsersResponse.Users[0]
        return currentUser
    } catch (e) {
        return e instanceof Error
            ? e
            : new Error(`Failed to fetch user from Cognito: ${String(e)}`)
    }
}

// these are the strings sent for the "role" by IDM.
const CMS_ROLE_ATTRIBUTE = 'macmcrrs-cms-user'
const STATE_ROLE_ATTRIBUTE = 'macmcrrs-state-user'
const ADMIN_ROLE_ATTRIBUTE = 'macmcrrs-approver'
const HELPDESK_ROLE_ATTRIBUTE = 'macmcrrs-helpdesk'
const BUSINESSOWNER_ROLE_ATTRIBUTE = 'macmcrrs-bo'
const CMS_APPROVER_ROLE_ATTRIBUTE = 'macmcrrs-cms-approver'

export function userTypeFromAttributes(
    id: string,
    attributes: {
        [key: string]: string
    }
): UserType | Error {
    // check for all the shared attrs here
    if (
        !(
            'custom:role' in attributes &&
            'email' in attributes &&
            'given_name' in attributes &&
            'family_name' in attributes
        )
    ) {
        return new Error(
            'User does not have all the required attributes: ' +
                JSON.stringify(attributes)
        )
    }

    // Roles are a list of all the roles a user has in IDM.
    const roleAttribute = attributes['custom:role']
    const roles = roleAttribute.split(',')

    // Arbitrarily, we check for the state user role first. If a user managed to have both roles, this is a little weird.
    // but as of September 2021, it shouldn't be possible for someone to have more than one MC Review role
    if (roles.includes(STATE_ROLE_ATTRIBUTE)) {
        if (!('custom:state_code' in attributes)) {
            return new Error(
                'State User does not have all the required attributes: ' +
                    JSON.stringify(attributes)
            )
        }
        return {
            id,
            role: 'STATE_USER',
            email: attributes.email,
            stateCode: attributes['custom:state_code'],
            givenName: attributes.given_name,
            familyName: attributes.family_name,
        }
    }

    if (roles.includes(CMS_ROLE_ATTRIBUTE)) {
        return {
            id,
            role: 'CMS_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
            stateAssignments: [],
            divisionAssignment: isValidCmsDivison(attributes.division)
                ? attributes.division
                : undefined,
        }
    }

    if (roles.includes(CMS_APPROVER_ROLE_ATTRIBUTE)) {
        return {
            id,
            role: 'CMS_APPROVER_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
            stateAssignments: [],
            divisionAssignment: isValidCmsDivison(attributes.division)
                ? attributes.division
                : undefined,
        }
    }

    if (roles.includes(ADMIN_ROLE_ATTRIBUTE)) {
        return {
            id,
            role: 'ADMIN_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
        }
    }

    if (roles.includes(HELPDESK_ROLE_ATTRIBUTE)) {
        return {
            id,
            role: 'HELPDESK_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
        }
    }

    if (roles.includes(BUSINESSOWNER_ROLE_ATTRIBUTE)) {
        return {
            id,
            role: 'BUSINESSOWNER_USER',
            email: attributes.email,
            givenName: attributes.given_name,
            familyName: attributes.family_name,
        }
    }

    return new Error('Unsupported user role:  ' + roleAttribute)
}

function hasUserInfoChanged(sourceUser: UserType, dbUser: UserType): boolean {
    if (
        sourceUser.email !== dbUser.email ||
        sourceUser.givenName !== dbUser.givenName ||
        sourceUser.familyName !== dbUser.familyName ||
        sourceUser.role !== dbUser.role
    ) {
        return true
    }

    // Check stateCode for state users
    return (
        sourceUser.role === 'STATE_USER' &&
        dbUser.role === 'STATE_USER' &&
        sourceUser.stateCode !== dbUser.stateCode
    )
}

// Syncs a source user (from Cognito or local) with the DB.
// Inserts the user if not found, updates if info has changed.
export async function syncUserWithAurora(
    store: Store,
    sourceUser: UserType
): Promise<UserType | Error> {
    const startRequest = performance.now()
    const auroraUser = await lookupUserAurora(store, sourceUser.id)
    if (auroraUser instanceof Error) {
        return auroraUser
    }
    const endRequest = performance.now()
    console.info('User lookup in postgres takes ms:', endRequest - startRequest)

    // User not in DB yet — insert
    if (auroraUser === undefined) {
        const userToInsert: InsertUserArgsType = {
            userID: sourceUser.id,
            role: sourceUser.role,
            givenName: sourceUser.givenName,
            familyName: sourceUser.familyName,
            email: sourceUser.email,
        }

        if (sourceUser.role === 'STATE_USER') {
            userToInsert.stateCode = sourceUser.stateCode
        }

        const result = await store.insertUser(userToInsert)
        if (result instanceof Error) {
            console.error(`Could not insert user: ${JSON.stringify(result)}`)
            return sourceUser
        }
        return result
    }

    // User exists — check if info has changed
    if (hasUserInfoChanged(sourceUser, auroraUser)) {
        console.info(
            `User info mismatch for user ${sourceUser.id}. Updating DB.`
        )
        const updateResult = await store.updateUserInfo(sourceUser.id, {
            email: sourceUser.email,
            givenName: sourceUser.givenName,
            familyName: sourceUser.familyName,
            role: sourceUser.role,
            stateCode:
                sourceUser.role === 'STATE_USER'
                    ? sourceUser.stateCode
                    : undefined,
        })
        if (updateResult instanceof Error) {
            console.error(
                `Failed to update user info for user ${sourceUser.id}: ${updateResult.message}`
            )
            return auroraUser
        }
        return updateResult
    }

    return auroraUser
}

// userFromCognitoAuthProvider hits the Cognito API to get the information in the authProvider
export async function userFromCognitoAuthProvider(
    authProvider: string,
    store?: Store
): Promise<UserType | Error> {
    try {
        const parseResult = parseAuthProvider(authProvider)
        if (parseResult instanceof Error) {
            return parseResult
        }

        const userInfo = parseResult
        // if no store is given, we just get user from Cognito
        if (store === undefined) {
            return lookupUserCognito(userInfo.userId, userInfo.poolId)
        }

        const cognitoUserResult = await lookupUserCognito(
            userInfo.userId,
            userInfo.poolId
        )
        if (cognitoUserResult instanceof Error) {
            // Cognito failed — fall back to DB user if one exists
            const auroraUser = await lookupUserAurora(store, userInfo.userId)
            if (auroraUser instanceof Error) {
                console.error(
                    `Cognito and Aurora lookups both failed for user ${userInfo.userId}. ` +
                        `Cognito error: ${cognitoUserResult.message}. ` +
                        `Aurora error: ${auroraUser.message}`
                )
                return auroraUser
            }
            if (auroraUser !== undefined) {
                console.error(
                    `Cognito lookup failed, using DB user: ${cognitoUserResult.message}`
                )
                return auroraUser
            }
            // New user with no DB record — Cognito is required
            return cognitoUserResult
        }

        return syncUserWithAurora(store, cognitoUserResult)
    } catch (e) {
        return e instanceof Error
            ? e
            : new Error(
                  `Unexpected error in userFromCognitoAuthProvider: ${String(e)}`
              )
    }
}

async function lookupUserCognito(
    userId: string,
    poolId: string
): Promise<UserType | Error> {
    const fetchResult = await fetchUserFromCognito(userId, poolId)

    if (fetchResult instanceof Error) {
        return fetchResult
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

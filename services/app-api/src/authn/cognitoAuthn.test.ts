import {
    parseAuthProvider,
    userFromCognitoAuthProvider,
    userTypeFromAttributes,
} from './cognitoAuthn'
import type { UserType } from '../domain-models'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { NewPostgresStore } from '../postgres'

describe('cognitoAuthn', () => {
    describe('parseAuthProvider', () => {
        it('parses valid and invalid strings', () => {
            type authProviderTest = {
                provider: string
                expectedResult: { userId: string; poolId: string } | Error
            }

            const tests: authProviderTest[] = [
                {
                    provider:
                        'cognito-idp.us-east-1.amazonaws.com/us-east-1_9uqvrgbHM,cognito-idp.us-east-1.amazonaws.com/us-east-1_9uqvrgbHM:CognitoSignIn:09882a37-fbeb-423d-a989-da7f43fdb252',
                    expectedResult: {
                        userId: '09882a37-fbeb-423d-a989-da7f43fdb252',
                        poolId: 'us-east-1_9uqvrgbHM',
                    },
                },
                {
                    provider: 'foo',
                    expectedResult: new Error(
                        'authProvider doesnt have enough parts'
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
                expectedResult: UserType | Error
            }

            const testID = 'foobar'

            const tests: samlAttrTest[] = [
                {
                    attributes: {
                        'custom:role': 'macmcrrs-state-user',
                        'custom:state_code': 'VA',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'STATE_USER',
                        email: 'gp@example.com',
                        stateCode: 'VA',
                        givenName: 'Generic',
                        familyName: 'Person',
                    },
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-cms-user',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'CMS_USER',
                        email: 'gp@example.com',
                        familyName: 'Person',
                        givenName: 'Generic',
                        stateAssignments: [],
                    },
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-cms-approver',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'CMS_APPROVER_USER',
                        email: 'gp@example.com',
                        familyName: 'Person',
                        givenName: 'Generic',
                        stateAssignments: [],
                    },
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-approver',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'ADMIN_USER',
                        email: 'gp@example.com',
                        familyName: 'Person',
                        givenName: 'Generic',
                    },
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-helpdesk',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'HELPDESK_USER',
                        email: 'gp@example.com',
                        familyName: 'Person',
                        givenName: 'Generic',
                    },
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-bo',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'BUSINESSOWNER_USER',
                        email: 'gp@example.com',
                        familyName: 'Person',
                        givenName: 'Generic',
                    },
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-ro-user',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'READONLY_USER',
                        email: 'gp@example.com',
                        familyName: 'Person',
                        givenName: 'Generic',
                    },
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
                    expectedResult: {
                        id: testID,
                        role: 'STATE_USER',
                        email: 'gp@example.com',
                        stateCode: 'FL',
                        givenName: 'Generic',
                        familyName: 'Person',
                    },
                },
                {
                    attributes: {
                        'custom:role': 'macmcrrs-cms-user,macmcrrs-state-user',
                        'custom:state_code': 'FL',
                        given_name: 'Generic',
                        family_name: 'Person',
                        email: 'gp@example.com',
                    },
                    expectedResult: {
                        id: testID,
                        role: 'STATE_USER',
                        email: 'gp@example.com',
                        stateCode: 'FL',
                        givenName: 'Generic',
                        familyName: 'Person',
                    },
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
                    expectedResult: new Error(
                        'Unsupported user role:  SOME_OPE User,neid-lame-user,smacfi-enduser,twoell-mmc-user,wefoi-mmc-ab-auth-user,POSS_ENDUSER,strongweak-user,ma-user'
                    ),
                },
                {
                    attributes: { foo: 'bar' },
                    expectedResult: new Error(
                        'User does not have all the required attributes: {"foo":"bar"}'
                    ),
                },
            ]

            tests.forEach((test) => {
                const actualResult = userTypeFromAttributes(
                    testID,
                    test.attributes
                )

                expect(actualResult).toEqual(test.expectedResult)
            })
        })
    })
})

// Mock the Cognito SDK
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: vi.fn(function () {
        return { send: mockSend }
    }),
    ListUsersCommand: vi.fn(),
}))

// Helper to build a mock Cognito ListUsers response
function mockCognitoUser(attrs: {
    role: string
    email: string
    givenName: string
    familyName: string
    stateCode?: string
}) {
    const attributes = [
        { Name: 'custom:role', Value: attrs.role },
        { Name: 'email', Value: attrs.email },
        { Name: 'given_name', Value: attrs.givenName },
        { Name: 'family_name', Value: attrs.familyName },
    ]
    if (attrs.stateCode) {
        attributes.push({
            Name: 'custom:state_code',
            Value: attrs.stateCode,
        })
    }
    return { Users: [{ Attributes: attributes }] }
}

// Helper to build a valid authProvider string
function testAuthProvider(userId: string, poolId = 'us-east-1_testPool') {
    return `cognito-idp.us-east-1.amazonaws.com/${poolId},cognito-idp.us-east-1.amazonaws.com/${poolId}:CognitoSignIn:${userId}`
}

describe('userFromCognitoAuthProvider', () => {
    beforeEach(() => {
        mockSend.mockReset()
    })

    it('inserts a new user into the DB from Cognito', async () => {
        const userId = 'new-cognito-user-id'
        mockSend.mockResolvedValue(
            mockCognitoUser({
                role: 'macmcrrs-state-user',
                email: 'newuser@example.com',
                givenName: 'New',
                familyName: 'User',
                stateCode: 'FL',
            })
        )

        const prismaClient = await sharedTestPrismaClient()
        const store = NewPostgresStore(prismaClient)

        const result = await userFromCognitoAuthProvider(
            testAuthProvider(userId),
            store
        )

        expect(result).not.toBeInstanceOf(Error)
        if (result instanceof Error) return

        expect(result.email).toBe('newuser@example.com')
        expect(result.givenName).toBe('New')
        expect(result.familyName).toBe('User')
        expect(result.role).toBe('STATE_USER')

        // Verify user was persisted
        const dbUser = await store.findUser(userId)
        expect(dbUser).not.toBeUndefined()
        expect(dbUser).not.toBeInstanceOf(Error)
        if (!dbUser || dbUser instanceof Error) return
        expect(dbUser.email).toBe('newuser@example.com')
    })

    it('updates DB when Cognito user info has changed and updatedAt is stale', async () => {
        const userId = 'update-cognito-user-id'
        const prismaClient = await sharedTestPrismaClient()
        const store = NewPostgresStore(prismaClient)

        // First call — insert the user
        mockSend.mockResolvedValue(
            mockCognitoUser({
                role: 'macmcrrs-state-user',
                email: 'before@example.com',
                givenName: 'Before',
                familyName: 'Change',
                stateCode: 'FL',
            })
        )
        await userFromCognitoAuthProvider(testAuthProvider(userId), store)

        // Set updatedAt to yesterday so the daily sync triggers
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        await prismaClient.user.update({
            where: { id: userId },
            data: { updatedAt: yesterday },
        })

        // Second call — Cognito returns updated email
        mockSend.mockResolvedValue(
            mockCognitoUser({
                role: 'macmcrrs-state-user',
                email: 'after@example.com',
                givenName: 'After',
                familyName: 'Change',
                stateCode: 'FL',
            })
        )
        const result = await userFromCognitoAuthProvider(
            testAuthProvider(userId),
            store
        )

        expect(result).not.toBeInstanceOf(Error)
        if (result instanceof Error) return

        expect(result.email).toBe('after@example.com')
        expect(result.givenName).toBe('After')

        // Verify DB was updated
        const dbUser = await store.findUser(userId)
        expect(dbUser).toBeDefined()
        expect(dbUser).not.toBeInstanceOf(Error)
        if (!dbUser || dbUser instanceof Error) return
        expect(dbUser.email).toBe('after@example.com')
    })

    it('skips Cognito sync when user was already updated today', async () => {
        const userId = 'skip-sync-cognito-user-id'
        const prismaClient = await sharedTestPrismaClient()
        const store = NewPostgresStore(prismaClient)

        // Insert the user
        mockSend.mockResolvedValue(
            mockCognitoUser({
                role: 'macmcrrs-state-user',
                email: 'today@example.com',
                givenName: 'Today',
                familyName: 'User',
                stateCode: 'FL',
            })
        )
        await userFromCognitoAuthProvider(testAuthProvider(userId), store)

        // Reset mock to track that Cognito is NOT called again
        mockSend.mockReset()

        const result = await userFromCognitoAuthProvider(
            testAuthProvider(userId),
            store
        )

        expect(mockSend).not.toHaveBeenCalled()
        expect(result).not.toBeInstanceOf(Error)
        if (result instanceof Error) return
        expect(result.email).toBe('today@example.com')
    })

    it('updates DB when CMS user role changes to CMS approver', async () => {
        const userId = 'cms-role-change-user-id'
        const prismaClient = await sharedTestPrismaClient()
        const store = NewPostgresStore(prismaClient)

        // First call — insert as CMS user
        mockSend.mockResolvedValue(
            mockCognitoUser({
                role: 'macmcrrs-cms-user',
                email: 'cmsuser@example.com',
                givenName: 'CMS',
                familyName: 'User',
            })
        )
        await userFromCognitoAuthProvider(testAuthProvider(userId), store)

        // Set updatedAt to yesterday so the daily sync triggers
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        await prismaClient.user.update({
            where: { id: userId },
            data: { updatedAt: yesterday },
        })

        // Second call — now a CMS approver with updated email
        mockSend.mockResolvedValue(
            mockCognitoUser({
                role: 'macmcrrs-cms-approver',
                email: 'cmsapprover@example.com',
                givenName: 'CMS',
                familyName: 'User',
            })
        )
        const result = await userFromCognitoAuthProvider(
            testAuthProvider(userId),
            store
        )

        expect(result).not.toBeInstanceOf(Error)
        if (result instanceof Error) return

        expect(result.role).toBe('CMS_APPROVER_USER')
        expect(result.email).toBe('cmsapprover@example.com')

        // Verify DB was updated
        const dbUser = await store.findUser(userId)
        expect(dbUser).toBeDefined()
        expect(dbUser).not.toBeInstanceOf(Error)
        if (!dbUser || dbUser instanceof Error) return
        expect(dbUser.role).toBe('CMS_APPROVER_USER')
        expect(dbUser.email).toBe('cmsapprover@example.com')
    })

    it('Returns db user if Cognito fails during sync', async () => {
        const userId = 'fallback-cognito-user-id'
        const prismaClient = await sharedTestPrismaClient()
        const store = NewPostgresStore(prismaClient)

        // First call — insert the user successfully
        mockSend.mockResolvedValue(
            mockCognitoUser({
                role: 'macmcrrs-cms-approver',
                email: 'cmsapprover@example.com',
                givenName: 'CMS',
                familyName: 'User',
            })
        )
        await userFromCognitoAuthProvider(testAuthProvider(userId), store)

        // Set updatedAt to yesterday so the daily sync triggers
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        await prismaClient.user.update({
            where: { id: userId },
            data: { updatedAt: yesterday },
        })

        // Second call — Cognito throws
        mockSend.mockRejectedValue(new Error('ThrottlingException'))

        const result = await userFromCognitoAuthProvider(
            testAuthProvider(userId),
            store
        )

        expect(result).not.toBeInstanceOf(Error)
        if (result instanceof Error) return

        expect(result.role).toBe('CMS_APPROVER_USER')
        expect(result.email).toBe('cmsapprover@example.com')
    })

    it('returns error when Cognito fails and no DB user exists', async () => {
        const userId = 'no-db-cognito-user-id'
        const prismaClient = await sharedTestPrismaClient()
        const store = NewPostgresStore(prismaClient)

        mockSend.mockRejectedValue(new Error('ThrottlingException'))

        const result = await userFromCognitoAuthProvider(
            testAuthProvider(userId),
            store
        )

        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
            expect(result.message).toContain('ThrottlingException')
        }
    })

    it('returns error when Cognito returns no matching user and no DB user exists', async () => {
        const userId = 'empty-cognito-user-id'
        mockSend.mockResolvedValue({ Users: [] })

        const prismaClient = await sharedTestPrismaClient()
        const store = NewPostgresStore(prismaClient)

        const result = await userFromCognitoAuthProvider(
            testAuthProvider(userId),
            store
        )

        expect(result).toBeInstanceOf(Error)
        if (result instanceof Error) {
            expect(result.message).toContain('No user found')
        }
    })
})

import { describe, it, expect } from 'vitest'
import type { Context } from '../handlers/apollo_gql'
import type { UserType } from '../domain-models'
import {
    isOAuthClientCredentials,
    canRead,
    canWrite,
    canOauthWrite,
} from './oauthAuthorization'

// Mock users for testing
const mockStateUser: UserType = {
    id: 'state-user-1',
    email: 'state@example.com',
    givenName: 'State',
    familyName: 'User',
    role: 'STATE_USER',
    stateCode: 'MN',
}

const mockCMSUser: UserType = {
    id: 'cms-user-1',
    email: 'cms@example.com',
    givenName: 'CMS',
    familyName: 'User',
    role: 'CMS_USER',
    divisionAssignment: 'DMCO',
    stateAssignments: [],
}

describe('OAuth Authorization', () => {
    describe('isOAuthClientCredentials', () => {
        it('returns true for OAuth client with client_credentials', () => {
            const context: Context = {
                user: mockStateUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            }

            expect(isOAuthClientCredentials(context)).toBe(true)
        })

        it('returns false for regular user context', () => {
            const context: Context = {
                user: mockStateUser,
            }

            expect(isOAuthClientCredentials(context)).toBe(false)
        })

        it('returns false for OAuth client without client_credentials', () => {
            const context: Context = {
                user: mockStateUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['some_other_grant'],
                    iss: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            }

            expect(isOAuthClientCredentials(context)).toBe(false)
        })
    })

    describe('canRead', () => {
        it('allows reading for OAuth client with client_credentials', () => {
            const context: Context = {
                user: mockStateUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            }

            expect(canRead(context)).toBe(true)
        })

        it('allows reading for regular users', () => {
            const context: Context = {
                user: mockStateUser,
            }

            expect(canRead(context)).toBe(true)
        })
    })

    describe('canWrite', () => {
        it('denies writing for OAuth client', () => {
            const context: Context = {
                user: mockStateUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            }

            expect(canWrite(context)).toBe(false)
        })

        it('allows writing for regular users', () => {
            const context: Context = {
                user: mockStateUser,
            }

            expect(canWrite(context)).toBe(true)
        })
    })

    describe('canOauthWrite', () => {
        it('allows writing for OAuth client with scopes', () => {
            const context: Context = {
                user: mockCMSUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: ['CMS_SUBMISSION_ACTIONS'],
                    isDelegatedUser: true,
                },
            }

            expect(canOauthWrite(context)).toBe(true)
        })

        it('allows writing for regular users', () => {
            const context: Context = {
                user: mockStateUser,
            }

            expect(canOauthWrite(context)).toBe(true)
        })

        it('denies writing for an OAuth client without scopes', () => {
            const context: Context = {
                user: mockCMSUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: true,
                },
            }

            expect(canOauthWrite(context)).toBe(false)
        })

        it('denies writing for OAuth client when stage is prod', () => {
            process.env.stage = 'prod'

            const context: Context = {
                user: mockCMSUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: ['CMS_SUBMISSION_ACTIONS'],
                    isDelegatedUser: true,
                },
            }

            expect(canOauthWrite(context)).toBe(false)
        })
    })
})

import { describe, it, expect } from 'vitest'
import type { Context } from '../handlers/apollo_gql'
import type { UserType } from '../domain-models'
import {
    isOAuthClientCredentials,
    canRead,
    canWrite,
    canOauthWrite,
    canOauthAdminWrite,
    canHaveOAuthScopes,
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

const mockAdminUser: UserType = {
    id: 'admin-user-1',
    email: 'admin@example.com',
    givenName: 'Admin',
    familyName: 'User',
    role: 'ADMIN_USER',
}

describe('OAuth Authorization', () => {
    describe('canHaveOAuthScopes', () => {
        it('allows admin submission actions scope for admin users', () => {
            expect(
                canHaveOAuthScopes('ADMIN_USER', ['ADMIN_SUBMISSION_ACTIONS'])
            ).toBe(true)
        })

        it('denies CMS submission actions scope for admin users', () => {
            expect(
                canHaveOAuthScopes('ADMIN_USER', ['CMS_SUBMISSION_ACTIONS'])
            ).toBe(false)
        })

        it('denies admin submission actions scope for CMS users', () => {
            expect(
                canHaveOAuthScopes('CMS_USER', ['ADMIN_SUBMISSION_ACTIONS'])
            ).toBe(false)
        })

        it('allows CMS submission actions scope for CMS users', () => {
            expect(
                canHaveOAuthScopes('CMS_USER', ['CMS_SUBMISSION_ACTIONS'])
            ).toBe(true)
        })

        it('allows CMS submission actions scope for CMS approver users', () => {
            expect(
                canHaveOAuthScopes('CMS_APPROVER_USER', [
                    'CMS_SUBMISSION_ACTIONS',
                ])
            ).toBe(true)
        })

        it('denies mixed admin and CMS scopes for admin users', () => {
            expect(
                canHaveOAuthScopes('ADMIN_USER', [
                    'ADMIN_SUBMISSION_ACTIONS',
                    'CMS_SUBMISSION_ACTIONS',
                ])
            ).toBe(false)
        })
    })

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

    describe('canOauthAdminWrite', () => {
        it('denies writing for delegated OAuth client with admin submission actions scope', () => {
            const context: Context = {
                user: mockCMSUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: ['ADMIN_SUBMISSION_ACTIONS'],
                    isDelegatedUser: true,
                },
            }

            expect(canOauthAdminWrite(context)).toBe(false)
        })

        it('denies writing for delegated OAuth client without admin submission actions scope', () => {
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

            expect(canOauthAdminWrite(context)).toBe(false)
        })

        it('allows writing for non-delegated OAuth client with admin submission actions scope', () => {
            const context: Context = {
                user: mockAdminUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: ['ADMIN_SUBMISSION_ACTIONS'],
                    isDelegatedUser: false,
                },
            }

            expect(canOauthAdminWrite(context)).toBe(true)
        })
    })
})

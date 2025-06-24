import { describe, it, expect } from 'vitest'
import type { Context } from '../handlers/apollo_gql'
import type { UserType } from '../domain-models'
import {
    isOAuthClientCredentials,
    canRead,
    canWrite,
    canAccessState,
    hasCMSPermissions,
    getAuthContextInfo,
} from './oauthAuthorization'

// Mock users for testing
const mockStateUser: UserType = {
    id: 'state-user-1',
    email: 'state@example.com',
    givenName: 'State',
    familyName: 'User',
    role: 'STATE_USER',
    stateCode: 'MN',
    divisionAssignment: null,
    stateAssignments: [],
}

const mockCMSUser: UserType = {
    id: 'cms-user-1',
    email: 'cms@example.com',
    givenName: 'CMS',
    familyName: 'User',
    role: 'CMS_USER',
    stateCode: null,
    divisionAssignment: 'DMCO',
    stateAssignments: [],
}

const mockAdminUser: UserType = {
    id: 'admin-user-1',
    email: 'admin@example.com',
    givenName: 'Admin',
    familyName: 'User',
    role: 'ADMIN_USER',
    stateCode: null,
    divisionAssignment: null,
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
                    isOAuthClient: true,
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
                    isOAuthClient: true,
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
                    isOAuthClient: true,
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
                    isOAuthClient: true,
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

    describe('canAccessState', () => {
        it('allows OAuth client to access state based on associated user permissions', () => {
            const context: Context = {
                user: mockStateUser, // MN state user
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                },
            }
            
            expect(canAccessState(context, 'MN')).toBe(true)
            expect(canAccessState(context, 'CA')).toBe(false)
        })

        it('allows OAuth client with CMS user to access all states', () => {
            const context: Context = {
                user: mockCMSUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                },
            }
            
            expect(canAccessState(context, 'MN')).toBe(true)
            expect(canAccessState(context, 'CA')).toBe(true)
        })

        it('follows normal state access rules for regular users', () => {
            const context: Context = {
                user: mockStateUser,
            }
            
            expect(canAccessState(context, 'MN')).toBe(true)
            expect(canAccessState(context, 'CA')).toBe(false)
        })
    })

    describe('hasCMSPermissions', () => {
        it('returns true for OAuth client with CMS user', () => {
            const context: Context = {
                user: mockCMSUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                },
            }
            
            expect(hasCMSPermissions(context)).toBe(true)
        })

        it('returns false for OAuth client with state user', () => {
            const context: Context = {
                user: mockStateUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                },
            }
            
            expect(hasCMSPermissions(context)).toBe(false)
        })

        it('returns true for OAuth client with admin user', () => {
            const context: Context = {
                user: mockAdminUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                },
            }
            
            expect(hasCMSPermissions(context)).toBe(true)
        })
    })

    describe('getAuthContextInfo', () => {
        it('returns OAuth client info when present', () => {
            const context: Context = {
                user: mockStateUser,
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                },
            }
            
            const info = getAuthContextInfo(context)
            expect(info).toEqual({
                isOAuthClient: true,
                clientId: 'test-client',
                userId: 'state-user-1',
                userRole: 'STATE_USER',
                grants: ['client_credentials'],
            })
        })

        it('returns user info only for regular users', () => {
            const context: Context = {
                user: mockCMSUser,
            }
            
            const info = getAuthContextInfo(context)
            expect(info).toEqual({
                isOAuthClient: false,
                clientId: undefined,
                userId: 'cms-user-1',
                userRole: 'CMS_USER',
                grants: undefined,
            })
        })
    })
})
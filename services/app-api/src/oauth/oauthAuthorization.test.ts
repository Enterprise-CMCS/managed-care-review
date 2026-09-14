import { describe, it, expect } from 'vitest'
import type { Context } from '../handlers/apollo_gql'
import type { UserType } from '../domain-models'
import {
    isOAuthClientCredentials,
    canRead,
    canWrite,
    canOauthWrite,
    canOauthAdminWrite,
    canSyntheticDataWrite,
    type SyntheticDataWriteOperation,
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
const syntheticOAuthContext: Context = {
    user: mockStateUser,
    oauthClient: {
        clientId: 'synthetic-data-review-state',
        grants: ['client_credentials'],
        iss: 'mcreview-review',
        scopes: ['SYNTHETIC_DATA_WRITE'],
        isDelegatedUser: false,
    },
}

const enabledReviewEnvironment = {
    stage: 'synth-review',
    SYNTHETIC_DATA_ENABLED: 'true',
    SYNTHETIC_DATA_ALLOWED_STAGE: 'synth-review',
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
        it('allows writing for OAuth client with scopes when the feature flag is on', () => {
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

            expect(
                canOauthWrite(context, {
                    'external-api-write-request': true,
                })
            ).toBe(true)
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

        it('denies writing for OAuth client when the feature flag is off', () => {
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

            expect(
                canOauthWrite(context, {
                    'external-api-write-request': false,
                })
            ).toBe(false)
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
    describe('canSyntheticDataWrite', () => {
        it.each([
            'createContract',
            'updateContractDraftRevision',
            'submitContract',
            'generateUploadURL',
        ] as const)(
            'allows the %s operation in its exact review stage',
            (operation) => {
                expect(
                    canSyntheticDataWrite(
                        syntheticOAuthContext,
                        operation,
                        enabledReviewEnvironment
                    )
                ).toBe(true)
            }
        )

        it('denies operations outside the explicit allowlist', () => {
            expect(
                canSyntheticDataWrite(
                    syntheticOAuthContext,
                    'withdrawContract' as SyntheticDataWriteOperation,
                    enabledReviewEnvironment
                )
            ).toBe(false)
        })

        it.each([
            {
                stage: 'synth-review',
                SYNTHETIC_DATA_ENABLED: 'false',
                SYNTHETIC_DATA_ALLOWED_STAGE: 'synth-review',
            },
            {
                stage: 'another-review',
                SYNTHETIC_DATA_ENABLED: 'true',
                SYNTHETIC_DATA_ALLOWED_STAGE: 'synth-review',
            },
            {
                stage: 'prod',
                SYNTHETIC_DATA_ENABLED: 'true',
                SYNTHETIC_DATA_ALLOWED_STAGE: 'prod',
            },
        ])('denies an unsafe environment %#', (environment) => {
            expect(
                canSyntheticDataWrite(
                    syntheticOAuthContext,
                    'createContract',
                    environment
                )
            ).toBe(false)
        })

        it('denies a delegated OAuth client', () => {
            const context: Context = {
                ...syntheticOAuthContext,
                oauthClient: {
                    ...syntheticOAuthContext.oauthClient!,
                    isDelegatedUser: true,
                },
            }

            expect(
                canSyntheticDataWrite(
                    context,
                    'createContract',
                    enabledReviewEnvironment
                )
            ).toBe(false)
        })

        it('denies a client without the synthetic scope', () => {
            const context: Context = {
                ...syntheticOAuthContext,
                oauthClient: {
                    ...syntheticOAuthContext.oauthClient!,
                    scopes: [],
                },
            }

            expect(
                canSyntheticDataWrite(
                    context,
                    'createContract',
                    enabledReviewEnvironment
                )
            ).toBe(false)
        })
    })
})

import type { StateProgramType } from '../../domain-models'
import { GetAllStateProgramsDocument } from '../../gen/gqlClient'
import type { Store } from '../../postgres'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'

const statePrograms: StateProgramType[] = [
    {
        stateCode: 'FL',
        stateName: 'Florida',
        program: {
            id: 'c1f9371f-8e1a-4df9-b60e-7d2eaa2496fa',
            name: 'MMA',
            fullName: 'Managed Medical Assistance Program',
            isRateProgram: false,
            isDeprecated: false,
        },
    },
    {
        stateCode: 'MN',
        stateName: 'Minnesota',
        program: {
            id: '3f3f4f73-6323-4ec7-a50c-59e7689e9b72',
            name: 'SNBC',
            fullName: 'Special Needs BasicCare',
            isRateProgram: true,
            isDeprecated: true,
            deprecatedByProgramId: '2f05f329-a57a-4678-a209-cf35794f2f50',
        },
    },
]

const expectedEdges = statePrograms.map(
    ({ stateCode, stateName, program }) => ({
        stateCode,
        stateName,
        node: {
            ...program,
            deprecatedByProgramId: program.deprecatedByProgramId ?? null,
        },
    })
)

const findAllStatePrograms = vi.fn<Store['findAllStatePrograms']>()

beforeEach(() => {
    findAllStatePrograms.mockReset()
    findAllStatePrograms.mockResolvedValue(statePrograms)
})

describe('getAllStatePrograms', () => {
    it('returns every state program for a CMS user', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testCMSUser() },
            store: { findAllStatePrograms },
        })
        const result = await executeGraphQLOperation(server, {
            query: GetAllStateProgramsDocument,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data?.getAllStatePrograms.totalCount).toBe(
            expectedEdges.length
        )
        expect(result.data?.getAllStatePrograms.edges).toEqual(expectedEdges)
        expect(findAllStatePrograms).toHaveBeenCalledOnce()
    })

    it('rejects state users', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
            store: { findAllStatePrograms },
        })
        const result = await executeGraphQLOperation(server, {
            query: GetAllStateProgramsDocument,
        })
        const error = assertAnError(result)

        expect(error.message).toBe(
            'State users are not authorized to fetch all state programs'
        )
        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        expect(findAllStatePrograms).not.toHaveBeenCalled()
    })

    it('supports OAuth clients with read permissions', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            store: { findAllStatePrograms },
        })
        const result = await executeGraphQLOperation(server, {
            query: GetAllStateProgramsDocument,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data?.getAllStatePrograms.totalCount).toBe(
            expectedEdges.length
        )
        expect(result.data?.getAllStatePrograms.edges).toEqual(expectedEdges)
        expect(findAllStatePrograms).toHaveBeenCalledOnce()
    })

    it('rejects OAuth clients without read permissions', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: [],
                    iss: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            store: { findAllStatePrograms },
        })
        const result = await executeGraphQLOperation(server, {
            query: GetAllStateProgramsDocument,
        })
        const error = assertAnError(result)

        expect(error.message).toBe(
            'OAuth client does not have read permissions'
        )
        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        expect(findAllStatePrograms).not.toHaveBeenCalled()
    })

    it('returns an internal server error when state programs cannot be found', async () => {
        findAllStatePrograms.mockResolvedValueOnce(
            new Error('program source unavailable')
        )

        const server = await constructTestPostgresServer({
            context: { user: testCMSUser() },
            store: { findAllStatePrograms },
        })
        const result = await executeGraphQLOperation(server, {
            query: GetAllStateProgramsDocument,
        })
        const error = assertAnError(result)

        expect(error.message).toBe(
            'Issue finding all state programs: program source unavailable'
        )
        expect(assertAnErrorCode(result)).toBe('INTERNAL_SERVER_ERROR')
        expect(findAllStatePrograms).toHaveBeenCalledOnce()
    })
})

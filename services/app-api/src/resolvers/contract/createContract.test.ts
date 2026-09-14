import { afterEach, vi } from 'vitest'
import type { GraphQLResolveInfo } from 'graphql'
import {
    constructTestPostgresServer,
    defaultContext,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import type { CreateContractInput, Contract } from '../../gen/gqlServer'
import { CreateContractDocument } from '../../gen/gqlClient'
import { testCMSUser } from '../../testHelpers/userHelpers'
import type { Context } from '../../handlers/apollo_gql'
import type { Store } from '../../postgres'
import { createContract } from './createContract'

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('createContract', () => {
    it('returns contract with unlocked form data', async () => {
        const server = await constructTestPostgresServer()

        const input: CreateContractInput = {
            populationCovered: 'MEDICAID',
            programIDs: [
                '5c10fe9f-bec9-416f-a20c-718b152ad633',
                '037af66b-81eb-4472-8b80-01edf17d12d9',
            ],
            riskBasedContract: null,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
            contractSubmissionType: 'HEALTH_PLAN',
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateContractDocument,
            variables: { input },
        })

        expect(res.errors).toBeUndefined()

        const contract: Contract = res.data?.createContract.contract
        const draftData = contract.draftRevision?.formData

        if (!draftData) {
            throw new Error(`Unexpected error: draftRevision was undefined.`)
        }

        expect(contract.contractSubmissionType).toBe('HEALTH_PLAN')
        expect(draftData.submissionDescription).toBe('A real submission')
        expect(draftData.submissionType).toBe('CONTRACT_ONLY')
        expect(draftData.programIDs).toEqual([
            '5c10fe9f-bec9-416f-a20c-718b152ad633',
            '037af66b-81eb-4472-8b80-01edf17d12d9',
        ])
        expect(draftData.contractDocuments).toHaveLength(0)
        expect(draftData.managedCareEntities).toHaveLength(0)
        expect(draftData.federalAuthorities).toHaveLength(0)
        expect(draftData.contractDateStart).toBeNull()
        expect(draftData.contractDateEnd).toBeNull()
    })

    it('allows the synthetic OAuth client in its exact review stage', async () => {
        vi.stubEnv('stage', 'synth-review')
        vi.stubEnv('SYNTHETIC_DATA_ENABLED', 'true')
        vi.stubEnv('SYNTHETIC_DATA_ALLOWED_STAGE', 'synth-review')

        const context: Context = {
            ...defaultContext(),
            oauthClient: {
                clientId: 'synthetic-data-review-state',
                grants: ['client_credentials'],
                iss: 'mcreview-synth-review',
                scopes: ['SYNTHETIC_DATA_WRITE'],
                isDelegatedUser: false,
            },
        }
        const insertDraftContract = vi.fn().mockResolvedValue({
            id: 'synthetic-contract',
            status: 'DRAFT',
        })
        const store = {
            findPrograms: vi.fn().mockReturnValue([]),
            insertDraftContract,
        } as unknown as Store
        const input: CreateContractInput = {
            populationCovered: 'MEDICAID',
            programIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633'],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription:
                '[SYNTHETIC:review-smoke-v1:contract-only:test]',
            contractType: 'BASE',
            contractSubmissionType: 'HEALTH_PLAN',
        }

        const resolver = createContract(store)
        if (typeof resolver !== 'function') {
            throw new Error('Expected createContract resolver function')
        }
        const result = await resolver(
            {},
            { input },
            context,
            {} as GraphQLResolveInfo
        )

        expect(insertDraftContract).toHaveBeenCalledOnce()
        expect(result.contract).toMatchObject({
            id: 'synthetic-contract',
            status: 'DRAFT',
        })
    })

    it('returns an error if the program id is not in valid', async () => {
        const server = await constructTestPostgresServer()
        const input: CreateContractInput = {
            populationCovered: 'MEDICAID',
            programIDs: ['xyz123'],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
            contractSubmissionType: 'HEALTH_PLAN',
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateContractDocument,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'The program id xyz123 does not exist in state FL'
        )
    })

    it('returns an error if a CMS user attempts to create', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const input: CreateContractInput = {
            populationCovered: 'MEDICAID',
            programIDs: ['xyz123'],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
            contractSubmissionType: 'HEALTH_PLAN',
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateContractDocument,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'user not authorized to create state data'
        )
    })
})

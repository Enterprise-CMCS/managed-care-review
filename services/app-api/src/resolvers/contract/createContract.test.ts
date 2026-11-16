import { afterEach, vi } from 'vitest'
import type { GraphQLResolveInfo } from 'graphql'
import {
    constructTestPostgresServer,
    defaultContext,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import type {
    Contract,
    ContractSubmissionType,
    CreateContractInput,
} from '../../gen/gqlServer'
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

    it('creates an ILOS submission with ILOS fields and no health plan fields', async () => {
        const server = await constructTestPostgresServer()

        const input: CreateContractInput = {
            programIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633'],
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An ILOS actuarial report',
            contractType: 'BASE',
            contractSubmissionType: 'ILOS',
            isILOSRatesIncluded: true,
            ilosRateDateStart: '2025-01-01',
            ilosRateDateEnd: '2025-12-31',
            ilosDocuments: [
                {
                    name: 'ilosReport1.pdf',
                    s3URL: 's3://bucketname/key/ilosReport1.pdf',
                    sha256: 'needs-to-be-there',
                },
            ],
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

        expect(contract.contractSubmissionType).toBe('ILOS')
        expect(draftData.submissionType).toBe('CONTRACT_AND_RATES')
        expect(draftData.isILOSRatesIncluded).toBe(true)
        expect(draftData.ilosRateDateStart).toBe('2025-01-01')
        expect(draftData.ilosRateDateEnd).toBe('2025-12-31')
        expect(draftData.ilosDocuments).toEqual([
            expect.objectContaining({
                name: 'ilosReport1.pdf',
                s3URL: 's3://bucketname/key/ilosReport1.pdf',
                sha256: 'needs-to-be-there',
            }),
        ])
        expect(draftData.ilosExternalRates).toHaveLength(0)
        expect(draftData.populationCovered).toBeNull()
        expect(draftData.riskBasedContract).toBeNull()
        expect(draftData.contractDocuments).toHaveLength(0)
        expect(draftData.managedCareEntities).toHaveLength(0)
    })

    it('returns an error naming every missing ILOS field on create', async () => {
        const server = await constructTestPostgresServer()

        const input: CreateContractInput = {
            programIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633'],
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An ILOS actuarial report',
            contractType: 'BASE',
            contractSubmissionType: 'ILOS',
            ilosDocuments: [],
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateContractDocument,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(res.errors?.[0].message).toContain('isILOSRatesIncluded')
        expect(res.errors?.[0].message).toContain('ilosRateDateStart')
        expect(res.errors?.[0].message).toContain('ilosRateDateEnd')
        expect(res.errors?.[0].message).toContain('ilosDocuments')
    })

    it.each<ContractSubmissionType>(['HEALTH_PLAN', 'EQRO'])(
        'still requires populationCovered for %s submissions',
        async (contractSubmissionType) => {
            const server = await constructTestPostgresServer()

            const input: CreateContractInput = {
                programIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633'],
                submissionType: 'CONTRACT_ONLY',
                submissionDescription: 'A real submission',
                contractType: 'BASE',
                contractSubmissionType,
            }
            const res = await executeGraphQLOperation(server, {
                query: CreateContractDocument,
                variables: { input },
            })

            expect(res.errors).toBeDefined()
            expect(res.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
            expect(res.errors?.[0].extensions?.argumentName).toBe(
                'populationCovered'
            )
        }
    )

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

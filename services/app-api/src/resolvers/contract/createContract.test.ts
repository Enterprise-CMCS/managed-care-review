import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import type { CreateContractInput, Contract } from '../../gen/gqlServer'
import CREATE_CONTRACT from 'app-graphql/src/mutations/createContract.graphql'
import { testCMSUser } from '../../testHelpers/userHelpers'

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
        }
        const res = await server.executeOperation({
            query: CREATE_CONTRACT,
            variables: { input },
        })

        expect(res.errors).toBeUndefined()

        const contract: Contract = res.data?.createContract.contract
        const draftData = contract.draftRevision?.formData

        if (!draftData) {
            throw new Error(`Unexpected error: draftRevision was undefined.`)
        }

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

    it('returns an error if the program id is not in valid', async () => {
        const server = await constructTestPostgresServer()
        const input: CreateContractInput = {
            populationCovered: 'MEDICAID',
            programIDs: ['xyz123'],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
        }
        const res = await server.executeOperation({
            query: CREATE_CONTRACT,
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
        }
        const res = await server.executeOperation({
            query: CREATE_CONTRACT,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'user not authorized to create state data'
        )
    })
})

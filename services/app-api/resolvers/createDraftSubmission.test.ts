import { CreateDraftSubmissionInput } from '../gen/gqlServer'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import { constructTestPostgresServer } from '../testHelpers/gqlHelpers'

describe('createDraftSubmission', () => {
    it('returns draft submission payload with a draft submission', async () => {
        const server = await constructTestPostgresServer()

        const input: CreateDraftSubmissionInput = {
            programIDs: ['5c10fe9f-bec9-416f-a20c-718b152ad633', '037af66b-81eb-4472-8b80-01edf17d12d9'],
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
        }
        const res = await server.executeOperation({
            query: CREATE_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(res.errors).toBeUndefined()

        const draft = res.data?.createDraftSubmission.draftSubmission
        expect(draft.submissionDescription).toBe('A real submission')
        expect(draft.submissionType).toBe('CONTRACT_ONLY')
        expect(draft.programIDs).toEqual(['5c10fe9f-bec9-416f-a20c-718b152ad633', '037af66b-81eb-4472-8b80-01edf17d12d9'])
        expect(draft.name).toContain('FL-MMA')
        expect(draft.documents.length).toBe(0)
        expect(draft.managedCareEntities.length).toBe(0)
        expect(draft.federalAuthorities.length).toBe(0)
        expect(draft.contractDateStart).toBe(null)
        expect(draft.contractDateEnd).toBe(null)
        // test the proper construction of the submission name (sorted, includes all program ids)
        expect(draft.name).toContain('MMA')
        expect(draft.name).toContain('PCCME')
        expect(draft.name.indexOf('MMA'))
            .toBeLessThan(draft.name.indexOf('PCCME'))
    
    })

    it('returns an error if the program id is not in valid', async () => {
        const server = await constructTestPostgresServer()
        const input: CreateDraftSubmissionInput = {
            programIDs: ['xyz123'],
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
        }
        const res = await server.executeOperation({
            query: CREATE_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'The program id xyz123 does not exist in state FL'
        )
    })
})

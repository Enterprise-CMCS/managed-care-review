import { CreateDraftSubmissionInput } from '../gen/gqlServer'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import { constructTestPostgresServer } from '../testHelpers/gqlHelpers'

describe('createDraftSubmission', () => {
    it('returns draft submission payload with a draft submission', async () => {
        const server = await constructTestPostgresServer()

        const input: CreateDraftSubmissionInput = {
            programID: 'managed-medical-assistance',
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
        expect(draft.program.id).toBe('managed-medical-assistance')
        expect(draft.program.name).toBe('Managed Medical Assistance')
        expect(draft.name).toContain('FL-MANAGED-MEDICAL-ASSISTANCE')
        expect(draft.documents.length).toBe(0)
        expect(draft.managedCareEntities.length).toBe(0)
        expect(draft.federalAuthorities.length).toBe(0)
        expect(draft.contractDateStart).toBe(null)
        expect(draft.contractDateEnd).toBe(null)
    })

    it('returns an error if the program id is not in valid', async () => {
        const server = await constructTestPostgresServer()
        const input: CreateDraftSubmissionInput = {
            programID: 'xyz123',
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

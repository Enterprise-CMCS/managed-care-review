import { createTestClient } from 'apollo-server-testing'

import { CreateDraftSubmissionInput, SubmissionType } from '../gen/gqlServer'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import { constructTestServer } from '../testHelpers/gqlHelpers'

describe('createDraftSubmission', () => {
    it('returns draft submission payload with a draft submission', async () => {
        const server = constructTestServer()

        const { mutate } = createTestClient(server)

        const input: CreateDraftSubmissionInput = {
            programID: 'managed-medical-assistance',
            submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
            submissionDescription: 'A real submission',
        }
        const res = await mutate({
            mutation: CREATE_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(res.errors).toBeUndefined()
        expect(
            res.data.createDraftSubmission.draftSubmission.submissionDescription
        ).toBe('A real submission')
        expect(
            res.data.createDraftSubmission.draftSubmission.submissionType
        ).toBe('CONTRACT_ONLY')
        expect(res.data.createDraftSubmission.draftSubmission.program.id).toBe(
            'managed-medical-assistance'
        )
        expect(
            res.data.createDraftSubmission.draftSubmission.program.name
        ).toBe('Managed Medical Assistance')
        expect(res.data.createDraftSubmission.draftSubmission.name).toContain(
            'FL-MANAGED-MEDICAL-ASSISTANCE'
        )
        expect(
            res.data.createDraftSubmission.draftSubmission.documents.length
        ).toBe(0)
        expect(
            res.data.createDraftSubmission.draftSubmission.managedCareEntities
                .length
        ).toBe(0)
        expect(
            res.data.createDraftSubmission.draftSubmission.federalAuthorities
                .length
        ).toBe(0)
        expect(
            res.data.createDraftSubmission.draftSubmission.contractDateStart
        ).toBe(null)
        expect(
            res.data.createDraftSubmission.draftSubmission.contractDateEnd
        ).toBe(null)
    })

    it('returns an error if the program id is not in valid', async () => {
        const server = constructTestServer()
        const { mutate } = createTestClient(server)
        const input: CreateDraftSubmissionInput = {
            programID: 'xyz123',
            submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
            submissionDescription: 'A real submission',
        }
        const res = await mutate({
            mutation: CREATE_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'The program id xyz123 does not exist in state FL'
        )
    })
})

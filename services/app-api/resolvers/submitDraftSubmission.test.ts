import SUBMIT_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/submitDraftSubmission.graphql'
import {
    StateSubmissionType,
    CognitoUserType,
} from '../../app-web/src/common-code/domain-models'
import { StateSubmission } from '../gen/gqlServer'
import {
    EmailData,
    Emailer,
    newPackageCMSEmailTemplate,
    newPackageStateEmailTemplate,
} from '../emailer'
import {
    constructTestPostgresServer,
    createAndUpdateTestDraftSubmission,
    fetchTestStateSubmissionById,
} from '../testHelpers/gqlHelpers'

describe('submitDraftSubmission', () => {
    it('returns a StateSubmission if complete', async () => {
        const server = await constructTestPostgresServer()

        // setup
        const draft = await createAndUpdateTestDraftSubmission(server, {})
        const draftID = draft.id

        // submit
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeUndefined()
        const createdID =
            submitResult?.data?.submitDraftSubmission.submission.id

        // test result
        const resultDraft = await fetchTestStateSubmissionById(
            server,
            createdID
        )

        // The submission fields should still be set
        expect(resultDraft.id).toEqual(createdID)
        expect(resultDraft.submissionType).toEqual('CONTRACT_AND_RATES')
        expect(resultDraft.program.id).toEqual('cnet')
        // check that the stateNumber is being returned the same
        expect(resultDraft.name.split('-')[2]).toEqual(draft.name.split('-')[2])
        expect(resultDraft.submissionDescription).toEqual(
            'An updated submission'
        )
        expect(resultDraft.documents).toEqual(draft.documents)

        // Contract details fields should still be set
        expect(resultDraft.contractType).toEqual(draft.contractType)
        expect(resultDraft.contractDateStart).toEqual(draft.contractDateStart)
        expect(resultDraft.contractDateEnd).toEqual(draft.contractDateEnd)
        expect(resultDraft.managedCareEntities).toEqual(
            draft.managedCareEntities
        )
        expect(resultDraft.contractDocuments).toEqual(draft.contractDocuments)

        expect(resultDraft.federalAuthorities).toEqual(draft.federalAuthorities)
        // submittedAt should be set to today's date
        const today = new Date()
        const expectedDate = today.toISOString().split('T')[0]
        expect(resultDraft.submittedAt).toEqual(expectedDate)

        // UpdatedAt should be after the former updatedAt
        const resultUpdated = new Date(resultDraft.updatedAt)
        const createdUpdated = new Date(draft.updatedAt)
        expect(
            resultUpdated.getTime() - createdUpdated.getTime()
        ).toBeGreaterThan(0)
    })

    it('returns an error if there are no contract documents attached', async () => {
        const server = await constructTestPostgresServer()

        const draft = await createAndUpdateTestDraftSubmission(server, {
            documents: [],
            contractDocuments: [],
        })
        const draftID = draft.id

        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeDefined()

        expect(submitResult.errors?.[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(submitResult.errors?.[0].extensions?.message).toEqual(
            'submissions must have valid documents'
        )
    })

    it('returns an error if there are no contract details fields', async () => {
        const server = await constructTestPostgresServer()

        const draft = await createAndUpdateTestDraftSubmission(server, {
            contractType: undefined,
            managedCareEntities: [],
            federalAuthorities: [],
        })

        const draftID = draft.id
        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeDefined()

        expect(submitResult.errors?.[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(submitResult.errors?.[0].extensions?.message).toEqual(
            'submissions is missing required contract fields'
        )
    })

    it('returns an error if there are missing rate details fields for submission type', async () => {
        const server = await constructTestPostgresServer()

        const draft = await createAndUpdateTestDraftSubmission(server, {
            submissionType: 'CONTRACT_AND_RATES',
            rateType: undefined,
            rateDateStart: undefined,
            rateDateEnd: undefined,
            rateDateCertified: undefined,
        })

        const draftID = draft.id
        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeDefined()

        expect(submitResult.errors?.[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(submitResult.errors?.[0].extensions?.message).toEqual(
            'submission is missing required rate fields'
        )
    })

    it('returns an error if there are invalid rate details fields for submission type', async () => {
        const server = await constructTestPostgresServer()

        const draft = await createAndUpdateTestDraftSubmission(server, {
            submissionType: 'CONTRACT_ONLY',
            rateDateStart: '2025-05-01',
            rateDateEnd: '2026-04-30',
            rateDateCertified: '2025-03-15',
        })

        const draftID = draft.id
        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeDefined()

        expect(submitResult.errors?.[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(submitResult.errors?.[0].extensions?.message).toEqual(
            'submission includes invalid rate fields'
        )
    })

    // move to test helpers
    const testEmailer = (): Emailer => {
        const config = {
            emailSource: 'local@example.com',
            stage: 'local',
            baseUrl: 'http://localhost',
            cmsReviewSharedEmails: ['test@example.com'],
        }
        return {
            sendEmail: jest.fn(
                async (emailData: EmailData): Promise<void | Error> => {
                    console.log('Email content' + emailData)
                }
            ),
            sendCMSNewPackage: function async(
                submission: StateSubmissionType
            ): Promise<void | Error> {
                const emailData = newPackageCMSEmailTemplate(submission, config)
                return this.sendEmail(emailData)
            },
            sendStateNewPackage: function async(
                submission: StateSubmissionType,
                user: CognitoUserType
            ): Promise<void | Error> {
                const emailData = newPackageStateEmailTemplate(
                    submission,
                    user,
                    config
                )
                return this.sendEmail(emailData)
            },
        }
    }

    it('send email to CMS if submission is valid', async () => {
        const mockEmailer = testEmailer()

        //mock invoke email submit lambda
        const server = await constructTestPostgresServer({
            emailer: mockEmailer,
        })
        const draft = await createAndUpdateTestDraftSubmission(server, {})
        const draftID = draft.id

        await new Promise((resolve) => setTimeout(resolve, 2000)) // TODO: why is this here in other tests??
        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeUndefined()

        const sub = submitResult?.data?.submitDraftSubmission
            ?.submission as StateSubmission

        expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                bodyText: `${sub.name} was received from FL.

            Submission type: Contract action and rate certification
            Submission description: An updated submission

            View submission: http://localhost/submissions/${sub.id}`,
            })
        )
    })

    it('send email to user and state contacts if submission is valid', async () => {
        const mockEmailer = testEmailer()
        const server = await constructTestPostgresServer({
            emailer: mockEmailer,
        })
        const draft = await createAndUpdateTestDraftSubmission(server, {})
        const draftID = draft.id

        await new Promise((resolve) => setTimeout(resolve, 2000)) // TODO: why is this here in other tests??
        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeUndefined()

        const sub = submitResult?.data?.submitDraftSubmission
            ?.submission as StateSubmission

        expect(mockEmailer.sendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                bodyText: `${sub.name} was successfully submitted.

            View submission: http://localhost/submissions/${sub.id}
            
            If you need to make any changes, please contact CMS.
        
            What comes next:
            1. Check for completeness: CMS will review all documentation submitted to ensure all required materials were received.
            2. CMS review: Your submission will be reviewed by CMS for adherence to federal regulations. If a rate certification is included, it will be reviewed for policy adherence and actuarial soundness.
            3. Questions: You may receive questions via email from CMS as they conduct their review.
            4. Decision: Once all questions have been addressed, CMS will contact you with their final recommendation.`,
            })
        )
    })

    it('does not send any emails if submission fails', async () => {
        const mockEmailer = testEmailer()
        const server = await constructTestPostgresServer({
            emailer: mockEmailer,
        })
        const draft = await createAndUpdateTestDraftSubmission(server, {
            submissionType: 'CONTRACT_ONLY',
            rateDateStart: '2025-05-01',
            rateDateEnd: '2026-04-30',
            rateDateCertified: '2025-03-15',
        })
        const draftID = draft.id

        const submitResult = await server.executeOperation({
            query: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeDefined()
        expect(mockEmailer.sendEmail).not.toHaveBeenCalled()
    })
})

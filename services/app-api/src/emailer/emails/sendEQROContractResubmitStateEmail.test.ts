import type { ContractType } from '../../domain-models'
import {
    mockEQROContract,
    mockMNState,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { sendEQROContractResubmitStateEmail } from './sendEQROContractResubmitStateEmail'

const updateInfo = {
    updatedBy: {
        email: 'house@example.com',
        role: 'STATE_USER' as const,
        givenName: 'Gregory',
        familyName: 'House',
    },
    updatedAt: new Date('03/09/2026'),
    updatedReason: 'Updated info',
}

describe('sendEQROContractResubmitStateEmail', () => {
    const submitterEmails = ['submitter1@example.com', 'submitter2@example.com']

    it('should render email for EQRO resubmit with no change in review determination', async () => {
        const baseSubmission = mockEQROContract()
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                baseSubmission.packageSubmissions[0],
                baseSubmission.packageSubmissions[0],
            ],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitStateEmail(
            contract,
            submitterEmails,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.subject).toContain('was resubmitted')
        expect(template.bodyText).toContain('was resubmitted')
        expect(template.bodyText).toContain(
            'Subject to formal review and approval'
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('should render email for EQRO resubmit when changed from subject to review to not subject to review', async () => {
        const baseSubmission = mockEQROContract()
        const previousSubmission = baseSubmission.packageSubmissions[0]
        const currentSubmission = {
            ...previousSubmission,
            contractRevision: {
                ...previousSubmission.contractRevision,
                formData: {
                    ...previousSubmission.contractRevision.formData,
                    eqroProvisionMcoNewOptionalActivity: false,
                    eqroProvisionNewMcoEqrRelatedActivities: false,
                },
            },
        }
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [currentSubmission, previousSubmission],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitStateEmail(
            contract,
            submitterEmails,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.subject).toContain('review decision update')
        expect(template.bodyText).toContain('is no longer subject to review')
        expect(template.bodyText).toContain(
            'Not subject to formal review and approval'
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('should render email for EQRO resubmit when changed from not subject to review to subject to review', async () => {
        const baseSubmission = mockEQROContract()
        const previousSubmission = {
            ...baseSubmission.packageSubmissions[0],
            contractRevision: {
                ...baseSubmission.packageSubmissions[0].contractRevision,
                formData: {
                    ...baseSubmission.packageSubmissions[0].contractRevision
                        .formData,
                    eqroProvisionMcoNewOptionalActivity: false,
                    eqroProvisionNewMcoEqrRelatedActivities: false,
                },
            },
        }
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                baseSubmission.packageSubmissions[0],
                previousSubmission,
            ],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitStateEmail(
            contract,
            submitterEmails,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.subject).toContain('review decision update')
        expect(template.bodyText).toContain('is now subject to review')
        expect(template.bodyText).toContain(
            'Subject to formal review and approval'
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('should include all state and submitter contact emails in toAddresses', async () => {
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()
        const baseSubmission = mockEQROContract()
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                {
                    ...baseSubmission.packageSubmissions[0],
                    contractRevision: {
                        ...baseSubmission.packageSubmissions[0]
                            .contractRevision,
                        formData: {
                            ...baseSubmission.packageSubmissions[0]
                                .contractRevision.formData,
                            stateContacts: [
                                {
                                    name: 'State Contact 1',
                                    titleRole: 'stateContact1',
                                    email: 'stateContact1@example.com',
                                },
                                {
                                    name: 'State Contact 2',
                                    titleRole: 'stateContact2',
                                    email: 'stateContact2@example.com',
                                },
                            ],
                        },
                    },
                },
                baseSubmission.packageSubmissions[0],
            ],
        })

        const template = await sendEQROContractResubmitStateEmail(
            contract,
            submitterEmails,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        contract.packageSubmissions[0].contractRevision.formData.stateContacts.forEach(
            (contact) => {
                expect(template).toEqual(
                    expect.objectContaining({
                        toAddresses: expect.arrayContaining([contact.email]),
                    })
                )
            }
        )

        submitterEmails.forEach((email) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([email]),
                })
            )
        })
    })

    it('should include link to submission', async () => {
        const baseSubmission = mockEQROContract()
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                baseSubmission.packageSubmissions[0],
                baseSubmission.packageSubmissions[0],
            ],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitStateEmail(
            contract,
            submitterEmails,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    `http://localhost/submissions/eqro/${contract.id}`
                ),
            })
        )
    })
})
